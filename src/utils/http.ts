import { CORS_ORIGIN } from "../config";

export function withCors(response: Response) {
    const headers = new Headers(response.headers);
    headers.set("access-control-allow-origin", CORS_ORIGIN);
    headers.set("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
    headers.set("access-control-allow-headers", "content-type,authorization");
    headers.set("access-control-max-age", "86400");
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

export function corsPreflight() {
    return withCors(new Response(null, { status: 204 }));
}
