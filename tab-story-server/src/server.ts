import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { ZodError, z } from 'zod';
import { accessToken, googleUserId, hashToken, matchesToken, refreshToken, verifyAccess, verifyGoogleCredential, verifyRefresh, type Claims } from './auth.js';
import { config } from './config.js';
import { prisma, pull, purgeTombstones, push } from './sync.js';

const app=express();
app.disable('x-powered-by');
app.set('trust proxy',config.trustProxyHops);
const allowOrigin=(origin:string|undefined,callback:(error:Error|null,allow?:boolean)=>void)=>callback(null,!origin||config.origins.includes(origin));
app.use(cors({origin:allowOrigin,credentials:true}));
app.use(express.json({limit:'2mb'}));

const deviceRequest=z.object({deviceId:z.string().trim().min(1).max(128),userId:z.string().uuid().optional(),bootstrapSecret:z.string().min(32).max(512)});
const googleRequest=z.object({deviceId:z.string().trim().min(1).max(128),credential:z.string().min(20).max(10000),credentialType:z.enum(['id_token','access_token'])});
const pushSubscription=z.object({endpoint:z.string().url().max(4096),expirationTime:z.number().nullable().optional(),keys:z.object({p256dh:z.string().min(1).max(512),auth:z.string().min(1).max(512)})}).strict();
const syncPayload=z.object({changes:z.unknown().optional(),cursor:z.string().regex(/^\d+$/).optional(),skipHorizon:z.boolean().optional()}).default({});
const authAttempts=new Map<string,{count:number;resetAt:number}>();
const authRateLimit=(req:express.Request,res:express.Response,next:express.NextFunction)=>{
 const now=Date.now(); const key=req.ip||'unknown'; const current=authAttempts.get(key);
 if(!current||current.resetAt<=now){authAttempts.set(key,{count:1,resetAt:now+60_000});return next();}
 if(current.count>=20){res.setHeader('Retry-After',Math.ceil((current.resetAt-now)/1000));return res.status(429).json({error:'RATE_LIMITED'});}
 current.count++; return next();
};
const health=async(_req:express.Request,res:express.Response)=>{try{await prisma.$queryRaw`SELECT 1`;res.status(200).json({ok:true});}catch{res.status(503).json({ok:false});}};
app.get('/healthz',health);
app.get('/health',health);
app.get('/config',(_req,res)=>res.json({pullPageSize:200,freeTabSaving:true,premiumFeatures:['ai-tools'],googleClientId:config.googleClientId}));
app.post('/auth/device',authRateLimit,async(req,res,next)=>{try{
  const body=deviceRequest.parse(req.body);
  if(body.bootstrapSecret!==config.bootstrapSecret)return res.status(401).json({error:'INVALID_BOOTSTRAP_SECRET'});
  const userId=body.userId??crypto.randomUUID();
  const user=await prisma.user.upsert({where:{id:userId},create:{id:userId},update:{},select:{tier:true}});
  const claims={userId,deviceId:body.deviceId}; const refresh=refreshToken(claims);
  await prisma.device.upsert({where:{userId_id:{userId,id:body.deviceId}},create:{userId,id:body.deviceId,refreshTokenHash:await hashToken(refresh)},update:{refreshTokenHash:await hashToken(refresh)}});
  res.json({userId,deviceId:body.deviceId,tier:user.tier,accessToken:accessToken(claims),refreshToken:refresh});
}catch(error){next(error)}});
app.post('/auth/google',authRateLimit,async(req,res,next)=>{try{
  if(!config.googleClientIds.length)return res.status(503).json({error:'GOOGLE_SIGN_IN_NOT_CONFIGURED'});
  const body=googleRequest.parse(req.body); const identity=await verifyGoogleCredential(body.credential,body.credentialType); const userId=googleUserId(identity.subject); const user=await prisma.user.upsert({where:{id:userId},create:{id:userId},update:{},select:{tier:true}}); const claims={userId,deviceId:body.deviceId}; const refresh=refreshToken(claims);
  await prisma.device.upsert({where:{userId_id:{userId,id:body.deviceId}},create:{userId,id:body.deviceId,refreshTokenHash:await hashToken(refresh)},update:{refreshTokenHash:await hashToken(refresh)}});
  res.json({userId,deviceId:body.deviceId,tier:user.tier,accessToken:accessToken(claims),refreshToken:refresh,email:identity.email,name:identity.name,authProvider:'google'});
}catch(error){if(error instanceof Error&&error.message.startsWith('GOOGLE_'))return res.status(401).json({error:'GOOGLE_SIGN_IN_FAILED'});next(error)}});

const server=http.createServer(app);
const io=new Server(server,{transports:['websocket'],cors:{origin:config.origins,credentials:true},allowRequest:(request,callback)=>callback(null,!request.headers.origin||config.origins.includes(request.headers.origin)),maxHttpBufferSize:2_000_000});
type AuthedSocket={data:{claims:Claims}};
io.use(async(socket,next)=>{try{
  const auth=socket.handshake.auth as {accessToken?:string;refreshToken?:string}; let claims:Claims;
  try{claims=verifyAccess(String(auth.accessToken||''));}
  catch{claims=verifyRefresh(String(auth.refreshToken||'')); const device=await prisma.device.findUnique({where:{userId_id:{userId:claims.userId,id:claims.deviceId}}});if(!device?.refreshTokenHash||!(await matchesToken(String(auth.refreshToken),device.refreshTokenHash)))throw new Error('Invalid refresh token');socket.emit('auth:access-token',{accessToken:accessToken(claims)});}
  const device=await prisma.device.findUnique({where:{userId_id:{userId:claims.userId,id:claims.deviceId}}}); if(!device)throw new Error('Unknown device');
  (socket as unknown as AuthedSocket).data.claims=claims; next();
}catch{next(new Error('AUTH_REQUIRED'))}});

io.on('connection',socket=>{
  const {userId,deviceId}=(socket as unknown as AuthedSocket).data.claims;
  let syncInFlight=false; let syncWindowStart=Date.now(); let syncCount=0;
  let subscriptionWindowStart=Date.now(); let subscriptionCount=0;
  socket.on('sync',async(payload:{changes?:unknown;cursor?:string;skipHorizon?:boolean},reply:(result:unknown)=>void)=>{if(syncInFlight){reply({ok:false,error:'SYNC_BUSY'});return;}
   const now=Date.now(); if(now-syncWindowStart>=60_000){syncWindowStart=now;syncCount=0;} if(++syncCount>120){reply({ok:false,error:'RATE_LIMITED'});return;} syncInFlight=true;
   try{
    const parsed=syncPayload.parse(payload); const cursor=BigInt(parsed.cursor||'0'); const pushed=await push(userId,deviceId,parsed.changes??[]); const page=await pull(userId,deviceId,cursor,200,!parsed.skipHorizon);
    reply({ok:true,pushed,page});
   }catch(error){reply({ok:false,error:error instanceof Error?error.message:'SYNC_FAILED'});}finally{syncInFlight=false;}
  });
  socket.on('device:push-subscription',async(subscription:unknown,reply:(result:unknown)=>void)=>{const now=Date.now();if(now-subscriptionWindowStart>=60_000){subscriptionWindowStart=now;subscriptionCount=0;}if(++subscriptionCount>10){reply({ok:false,error:'RATE_LIMITED'});return;}try{const parsed=pushSubscription.parse(subscription);await prisma.device.update({where:{userId_id:{userId,id:deviceId}},data:{pushSubscription:parsed}});reply({ok:true});}catch{reply({ok:false,error:'INVALID_PUSH_SUBSCRIPTION'});}});
});

app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{if(error instanceof ZodError)return res.status(400).json({error:'INVALID_REQUEST',issues:error.issues});console.error(error);return res.status(500).json({error:'INTERNAL_ERROR'});});
setInterval(()=>void purgeTombstones().catch(console.error),6*60*60*1000).unref();
setInterval(()=>{const now=Date.now();for(const [key,value] of authAttempts)if(value.resetAt<=now)authAttempts.delete(key);},10*60*1000).unref();
const shutdown=async()=>{await new Promise<void>((resolve)=>server.close(()=>resolve()));await prisma.$disconnect();};
process.once('SIGTERM',()=>void shutdown().finally(()=>process.exit(0)));
process.once('SIGINT',()=>void shutdown().finally(()=>process.exit(0)));
server.listen(config.port,()=>console.log(`Tab Story sync server listening on ${config.port}`));
