import { Router } from "../../../router";
import { json } from "../../../utils/json";
import { getAuthUser } from "../../../utils/auth";
import { ObjectId, usersCollection } from "../../../db";
import { publicProfile } from "../../../utils/profile";

export default function registerMeRoute(router: Router) {
    router.on("GET", "/v1/auth/me", async (req) => {
        const user = await getAuthUser(req);
        if (!user) {
            return json({ error: "no auth" }, { status: 401 });
        }
        const row = await usersCollection.findOne({ _id: new ObjectId(user.id) });
        return json(row ? { ...publicProfile(row), email: row.email } : { id: user.id, email: user.email });
    });
}
