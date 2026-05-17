import { createHmac, timingSafeEqual } from "crypto";
import { JWT_EXPIRES_IN_SECONDS, JWT_SECRET } from "../config";

export function signToken(payload: Record<string, unknown>) {
    const now = Math.floor(Date.now() / 1000);
    const data = Buffer.from(JSON.stringify({
        ...payload,
        iat: now,
        exp: now + JWT_EXPIRES_IN_SECONDS,
    })).toString("base64url");
    const mac = createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
    return `${data}.${mac}`;
}

export function verifyToken(token?: string) {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const data = parts[0];
    const mac = parts[1];
    const mac2 = createHmac("sha256", JWT_SECRET).update(data!).digest("base64url");
    if (mac.length !== mac2.length || !cryptoSafeEqual(mac, mac2)) return null;
    try {
        const base64 = data!.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
        if (payload?.exp && Date.now() / 1000 > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

function cryptoSafeEqual(a: string, b: string) {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
