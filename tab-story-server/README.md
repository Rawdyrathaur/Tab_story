# Tab Story sync server

Server-authoritative Socket.IO sync for the Tab Story PWA and browser extension.

## Run locally

1. Copy `.env.example` to `.env` and set the secrets.
2. Run `docker compose up -d`.
3. Run `npm install`, `npx prisma db push`, then `npm run dev`.

Clients authenticate in the Socket.IO handshake with `accessToken` and `refreshToken`, then send `sync` with `{ changes, cursor, skipHorizon? }`. Each response contains one pull page (`page.records`, up to 200) plus authoritative push results; clients request the next page using the returned cursor and an empty `changes` array. Saving and synchronizing tabs is available on the free plan; account tier is used for premium features such as AI Tools.

For production, copy `.env.example` to `.env`, replace every secret with a random value of at least 32 characters, set the Google OAuth client IDs, set the real PWA and extension origins, then run `docker compose up -d`, `npm ci`, `npm run db:generate`, `npm run db:migrate`, `npm run build`, and `npm start`. PostgreSQL binds to localhost only. Users authenticate with Google; the bootstrap secret is only for server-side provisioning and is never entered in the clients.
