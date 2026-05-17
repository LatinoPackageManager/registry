import { Router } from "../router";
import { json } from "../utils/json";
import registerV1Routes from "./v1";
import registerInstallScripts from "./install";

export default function registerRoutes(router: Router) {
    router.on("GET", "/health", () => json({ ok: true }));
    registerV1Routes(router);
    registerInstallScripts(router);
}
