import { Router } from "../router";
import { json } from "../utils/json";
import registerV1Routes from "./v1";

export default function registerRoutes(router: Router) {
    router.on("GET", "/health", () => json({ ok: true }));
    registerV1Routes(router);
}
