import semver from "semver";

export interface NormalizedManifest {
    name: string;
    version: string;
    description?: string;
    keywords: string[];
    license?: string;
    repository?: string;
    homepage?: string;
    readme?: string;
    dependencies: Record<string, string>;
    [key: string]: unknown;
}

const PACKAGE_NAME = /^[a-z0-9][a-z0-9._-]{0,213}$/;

export function normalizeManifest(raw: unknown, expectedName?: string, expectedVersion?: string) {
    const errors: string[] = [];
    const meta = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const name = typeof meta.name === "string" ? meta.name.trim().toLowerCase() : "";
    const version = typeof meta.version === "string" ? meta.version.trim() : "";

    if (!PACKAGE_NAME.test(name)) errors.push("name invalido");
    if (!semver.valid(version)) errors.push("version semver invalida");
    if (expectedName && name !== expectedName.toLowerCase()) errors.push("name no coincide con la URL");
    if (expectedVersion && version !== expectedVersion) errors.push("version no coincide con la URL");

    const dependencies = normalizeDependencies(meta.dependencies);
    for (const [depName, range] of Object.entries(dependencies)) {
        if (!PACKAGE_NAME.test(depName)) errors.push(`dependencia invalida: ${depName}`);
        if (range !== "*" && !semver.validRange(range)) errors.push(`rango invalido para ${depName}: ${range}`);
    }

    const manifest: NormalizedManifest = {
        ...meta,
        name,
        version,
        description: normalizeString(meta.description, 500),
        keywords: normalizeKeywords(meta.keywords),
        license: normalizeString(meta.license, 80),
        repository: normalizeString(meta.repository, 300),
        homepage: normalizeString(meta.homepage, 300),
        readme: normalizeString(meta.readme, 80_000),
        dependencies,
    };

    return { manifest, errors };
}

export function normalizeDependencies(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const deps: Record<string, string> = {};
    for (const [name, range] of Object.entries(value as Record<string, unknown>)) {
        deps[name.trim().toLowerCase()] = typeof range === "string" && range.trim() ? range.trim() : "*";
    }
    return deps;
}

function normalizeString(value: unknown, max: number) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : undefined;
}

function normalizeKeywords(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 30);
}
