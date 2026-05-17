export function json(data: unknown, init: ResponseInit = {}) {
    return new Response(JSON.stringify(data), {
        ...init,
        headers: {
            "content-type": "application/json",
            ...(init.headers || {}),
        },
    });
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
    try {
        return (await req.json()) as T;
    } catch {
        return null;
    }
}
