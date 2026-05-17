import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "../config";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(req: Request) {
    const forwarded = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for");
    const ip = (forwarded || "local").split(",")[0]!.trim();
    const now = Date.now();
    const bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    bucket.count += 1;
    return bucket.count > RATE_LIMIT_MAX;
}
