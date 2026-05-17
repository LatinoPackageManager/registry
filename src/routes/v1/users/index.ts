import { ObjectId, packagesCollection, usersCollection } from "../../../db";
import { Router } from "../../../router";
import { getAuthUser } from "../../../utils/auth";
import { json, readJson } from "../../../utils/json";
import { normalizeProfileInput, publicProfile } from "../../../utils/profile";

export default function registerUserRoutes(router: Router) {
    router.on("GET", "/v1/users/me/packages", async (req) => {
        const user = await getAuthUser(req);
        if (!user) return json({ error: "no auth" }, { status: 401 });
        return json({ packages: await getUserPackages(user.id) });
    });

    router.on("PATCH", "/v1/users/me", async (req) => {
        const auth = await getAuthUser(req);
        if (!auth) return json({ error: "no auth" }, { status: 401 });

        const body = await readJson<Record<string, unknown>>(req);
        if (!body) return json({ error: "json invalido" }, { status: 400 });

        const { profile, errors } = normalizeProfileInput(body);
        if (errors.length > 0) return json({ error: "perfil invalido", details: errors }, { status: 400 });

        if (profile.username) {
            const taken = await usersCollection.findOne({
                username: profile.username,
                _id: { $ne: new ObjectId(auth.id) },
            });
            if (taken) return json({ error: "username ya registrado" }, { status: 409 });
        }

        await usersCollection.updateOne({ _id: new ObjectId(auth.id) }, {
            $set: {
                ...profile,
                updatedAt: new Date(),
            },
        });
        const user = await usersCollection.findOne({ _id: new ObjectId(auth.id) });
        return json(user ? { ...publicProfile(user), email: user.email } : { ok: true });
    });

    router.on("GET", "/v1/users/:id", async (_req, params) => {
        const user = await findUser(params.id);
        if (!user) return json({ error: "not found" }, { status: 404 });
        return json({
            ...publicProfile(user),
            packages: await getUserPackages(user._id.toString()),
        });
    });
}

async function findUser(idOrUsername?: string) {
    if (!idOrUsername) return null;
    try {
        if (ObjectId.isValid(idOrUsername)) {
            const byId = await usersCollection.findOne({ _id: new ObjectId(idOrUsername) });
            if (byId) return byId;
        }
        return await usersCollection.findOne({ username: idOrUsername.toLowerCase() });
    } catch {
        return null;
    }
}

async function getUserPackages(userId: string) {
    const rows = await packagesCollection
        .find({ ownerId: new ObjectId(userId) }, {
            projection: {
                name: 1,
                description: 1,
                keywords: 1,
                license: 1,
                downloadCount: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        })
        .sort({ updatedAt: -1 })
        .toArray();

    return rows.map((row) => ({
        name: row.name,
        description: row.description,
        keywords: row.keywords || [],
        license: row.license,
        downloadCount: row.downloadCount || 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    }));
}
