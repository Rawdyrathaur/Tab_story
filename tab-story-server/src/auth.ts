import { createHash } from 'node:crypto'; import jwt from 'jsonwebtoken'; import bcrypt from 'bcryptjs'; import { z } from 'zod'; import { config } from './config.js';
export type Claims={userId:string;deviceId:string};
const claimsSchema=z.object({userId:z.string().uuid(),deviceId:z.string().min(1).max(128)});
export const accessToken=(claims:Claims)=>jwt.sign(claims,config.accessSecret,{expiresIn:`${config.accessMinutes}m`});
export const refreshToken=(claims:Claims)=>jwt.sign(claims,config.refreshSecret,{expiresIn:`${config.refreshDays}d`});
export const verifyAccess=(token:string)=>claimsSchema.parse(jwt.verify(token,config.accessSecret)) as Claims;
export const verifyRefresh=(token:string)=>claimsSchema.parse(jwt.verify(token,config.refreshSecret)) as Claims;
export const hashToken=(token:string)=>bcrypt.hash(token,12);
export const matchesToken=(token:string,hash:string)=>bcrypt.compare(token,hash);
export type GoogleIdentity={subject:string;email?:string;name?:string};
export async function verifyGoogleCredential(credential:string,kind:'id_token'|'access_token'):Promise<GoogleIdentity>{
 const endpoint=kind==='id_token'?'https://oauth2.googleapis.com/tokeninfo?id_token=':'https://oauth2.googleapis.com/tokeninfo?access_token=';
 const tokenResponse=await fetch(endpoint+encodeURIComponent(credential),{signal:AbortSignal.timeout(10000)}).catch(()=>{throw new Error('GOOGLE_VERIFICATION_UNAVAILABLE');});
 const tokenInfo=await tokenResponse.json().catch(()=>({})) as Record<string,unknown>;
 if(!tokenResponse.ok||typeof tokenInfo.sub!=='string')throw new Error('GOOGLE_CREDENTIAL_INVALID');
 if(config.googleClientIds.length&&(typeof tokenInfo.aud!=='string'||!config.googleClientIds.includes(tokenInfo.aud)))throw new Error('GOOGLE_CLIENT_NOT_ALLOWED');
 if(kind==='access_token'){
  const profileResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${credential}`},signal:AbortSignal.timeout(10000)}).catch(()=>{throw new Error('GOOGLE_PROFILE_UNAVAILABLE');});
  const profile=await profileResponse.json().catch(()=>({})) as Record<string,unknown>;
  if(!profileResponse.ok||profile.sub!==tokenInfo.sub)throw new Error('GOOGLE_PROFILE_INVALID');
  return {subject:tokenInfo.sub,email:typeof profile.email==='string'?profile.email:undefined,name:typeof profile.name==='string'?profile.name:undefined};
 }
 return {subject:tokenInfo.sub,email:typeof tokenInfo.email==='string'?tokenInfo.email:undefined,name:typeof tokenInfo.name==='string'?tokenInfo.name:undefined};
}
export function googleUserId(subject:string){
 const digest=createHash('sha1').update(`tab-story:google:${subject}`).digest();
 digest[6]=(digest[6]&0x0f)|0x50; digest[8]=(digest[8]&0x3f)|0x80;
 return [digest.subarray(0,4).toString('hex'),digest.subarray(4,6).toString('hex'),digest.subarray(6,8).toString('hex'),digest.subarray(8,10).toString('hex'),digest.subarray(10,16).toString('hex')].join('-');
}
