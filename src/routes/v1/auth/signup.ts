import { usersCollection } from "../../../db";
import { Router } from "../../../router";
import { json, readJson } from "../../../utils/json";
import { hashPassword } from "../../../utils/password";
import { normalizeProfileInput } from "../../../utils/profile";
import { signToken } from "../../../utils/token";

export default function registerSignupRoute(router: Router) {
    router.on("POST", "/v1/auth/signup", async (req) => {
        const body = await readJson<{ email: string; password: string; username?: string; displayName?: string; avatarUrl?: string }>(req);
        const email = body?.email?.trim().toLowerCase();
        const password = body?.password;
        if (!email || !password) {
            return json({ error: "email y password requeridos" }, { status: 400 });
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            return json({ error: "email invalido" }, { status: 400 });
        }
        if (password.length < 8) {
            return json({ error: "password debe tener al menos 8 caracteres" }, { status: 400 });
        }
        const existing = await usersCollection.findOne({ email });
        if (existing) {
            return json({ error: "email ya registrado" }, { status: 409 });
        }
        const { profile, errors } = normalizeProfileInput(body || {});
        if (errors.length > 0) {
            return json({ error: "perfil invalido", details: errors }, { status: 400 });
        }
        if (profile.username) {
            const usernameTaken = await usersCollection.findOne({ username: profile.username });
            if (usernameTaken) return json({ error: "username ya registrado" }, { status: 409 });
        }
        const hash = await hashPassword(password);
        const now = new Date();
        const result = await usersCollection.insertOne({
            email,
            passwordHash: hash,
            username: profile.username,
            displayName: profile.displayName || profile.username || email.split("@")[0],
            avatarUrl: profile.avatarUrl,
            bio: profile.bio,
            website: profile.website,
            github: profile.github,
            createdAt: now,
            updatedAt: now,
        });
        const token = signToken({ uid: result.insertedId.toString(), email });
        return json({ token });
    });
}
