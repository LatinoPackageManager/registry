import { usersCollection } from "../../../db";
import { Router } from "../../../router";
import { json, readJson } from "../../../utils/json";
import { verifyPassword } from "../../../utils/password";
import { signToken } from "../../../utils/token";

export default function registerLoginRoute(router: Router) {
    router.on("POST", "/v1/auth/login", async (req) => {
        const body = await readJson<{ email: string; password: string }>(req);
        const email = body?.email?.trim().toLowerCase();
        const password = body?.password || "";
        if (!email || !password) {
            return json({ error: "email y password requeridos" }, { status: 400 });
        }
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return json({ error: "credenciales" }, { status: 401 });
        }
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
            return json({ error: "credenciales" }, { status: 401 });
        }
        const token = signToken({ uid: user._id.toString(), email: user.email });
        return json({ token });
    });
}
