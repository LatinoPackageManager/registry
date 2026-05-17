export const NODE_ENV = process.env.NODE_ENV || "development";
export const JWT_SECRET: string = process.env.JWT_SECRET || "dev-secret";
export const JWT_EXPIRES_IN_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS || 60 * 60 * 24 * 30);

export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_ENDPOINT = process.env.R2_ENDPOINT!;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export const SERVER_PORT = Number(process.env.PORT || 8787);
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
export const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300);

export const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
export const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "latipm_registry";
export const MONGO_SERVER_SELECTION_TIMEOUT_MS = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10_000);

export function assertProductionConfig() {
    if (NODE_ENV !== "production") return;
    const missing = [
        ["JWT_SECRET", process.env.JWT_SECRET],
        ["MONGO_URI", process.env.MONGO_URI],
        ["R2_ACCESS_KEY_ID", process.env.R2_ACCESS_KEY_ID],
        ["R2_SECRET_ACCESS_KEY", process.env.R2_SECRET_ACCESS_KEY],
        ["R2_BUCKET", process.env.R2_BUCKET],
        ["R2_ENDPOINT", process.env.R2_ENDPOINT],
        ["R2_PUBLIC_URL", process.env.R2_PUBLIC_URL],
    ].filter(([, value]) => !value);

    if (JWT_SECRET === "dev-secret") missing.push(["JWT_SECRET", ""]);
    if (missing.length > 0) {
        throw new Error(`Missing production env vars: ${missing.map(([key]) => key).join(", ")}`);
    }
}
