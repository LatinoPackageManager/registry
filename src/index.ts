// Routes:
//  POST   /v1/auth/signup   {email,password}
//  POST   /v1/auth/login    {email,password}
//  GET    /v1/auth/me       (Bearer token)
//  POST   /v1/packages/:name/:version   (auth, form-data: meta, file, sha256)
//  GET    /v1/packages/:name            -> versions list
//  GET    /v1/packages/:name/:version   -> metadata
//  GET    /v1/search?q=term             -> simple name LIKE search
//  GET    /v1/download/:name/:version   -> zip file stream

import { assertProductionConfig, SERVER_PORT } from "./config";
import "./db";
import { router } from "./router";
import registerRoutes from "./routes";
import { corsPreflight, withCors } from "./utils/http";
import { isRateLimited } from "./utils/rate-limit";

assertProductionConfig();
registerRoutes(router);

const server = Bun.serve({
    port: SERVER_PORT,
    async fetch(req) {
        if (req.method === "OPTIONS") return corsPreflight(req);
        if (isRateLimited(req)) {
            return withCors(req, new Response(JSON.stringify({ error: "rate limit exceeded" }), {
                status: 429,
                headers: { "content-type": "application/json" },
            }));
        }
        return withCors(req, await router.route(req));
    },
});

console.log(`LatinoPM registry on http://localhost:${server.port}`);
