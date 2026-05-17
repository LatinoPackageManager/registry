import { CORS_ORIGIN } from "../config";

const allowedOrigins = CORS_ORIGIN.split(",").map(o => o.trim());

export function withCors(request: Request, response: Response) {
    const headers = new Headers(response.headers);
    const origin = request.headers.get("origin") || "";
    
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        headers.set("access-control-allow-origin", origin);
        headers.set("access-control-allow-methods", "GET,POST,DELETE,OPTIONS,PUT,PATCH");
        headers.set("access-control-allow-headers", "content-type,authorization");
        headers.set("access-control-max-age", "86400");
    }
    
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

export function corsPreflight(request: Request) {
    return withCors(request, new Response(null, { status: 204 }));
}
