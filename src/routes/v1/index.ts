import { Router } from "../../router";
import registerAuthRoutes from "./auth";
import registerDownloadRoute from "./download";
import registerPackageRoutes from "./packages";
import registerSearchRoute from "./search";
import registerUserRoutes from "./users";
import registerStatsRoute from "./stats";

export default function registerV1Routes(router: Router) {
    registerAuthRoutes(router);
    registerPackageRoutes(router);
    registerUserRoutes(router);
    registerSearchRoute(router);
    registerDownloadRoute(router);
    registerStatsRoute(router);
}
