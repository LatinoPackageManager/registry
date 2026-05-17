import type { UserDocument } from "../db";

const USERNAME = /^[a-z0-9][a-z0-9_-]{2,29}$/;

export interface PublicProfile {
    id: string;
    username?: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    website?: string;
    github?: string;
    createdAt: Date;
}

export function normalizeProfileInput(raw: Record<string, unknown>) {
    const errors: string[] = [];
    const username = normalizeUsername(raw.username);
    if (raw.username !== undefined && !username) {
        errors.push("username debe tener 3-30 caracteres y usar letras, numeros, _ o -");
    }

    const profile = {
        ...(username ? { username } : {}),
        displayName: normalizeString(raw.displayName, 80),
        avatarUrl: normalizeUrl(raw.avatarUrl, 500, "avatarUrl", errors),
        bio: normalizeString(raw.bio, 280),
        website: normalizeUrl(raw.website, 300, "website", errors),
        github: normalizeGithub(raw.github, errors),
    };

    return { profile, errors };
}

export function publicProfile(user: UserDocument): PublicProfile {
    return {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username || user.email.split("@")[0] || "LatinoPM user",
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        website: user.website,
        github: user.github,
        createdAt: user.createdAt,
    };
}

export function normalizeUsername(value: unknown) {
    if (typeof value !== "string") return undefined;
    const username = value.trim().toLowerCase();
    return USERNAME.test(username) ? username : undefined;
}

function normalizeString(value: unknown, max: number) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : undefined;
}

function normalizeUrl(value: unknown, max: number, field: string, errors: string[]) {
    const url = normalizeString(value, max);
    if (!url) return undefined;
    try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
        return parsed.toString();
    } catch {
        errors.push(`${field} debe ser URL http(s) valida`);
        return undefined;
    }
}

function normalizeGithub(value: unknown, errors: string[]) {
    const github = normalizeString(value, 39);
    if (!github) return undefined;
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(github)) {
        errors.push("github invalido");
        return undefined;
    }
    return github;
}
