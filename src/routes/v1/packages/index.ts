import { Router } from "../../../router";
import registerPackageDependentsRoute from "./dependents";
import registerPublishRoute from "./publish";
import registerPackageStatsRoute from "./stats";
import registerPackageVersionRoute from "./version";
import registerPackageVersionsRoute from "./versions";

export default function registerPackageRoutes(router: Router) {
    registerPublishRoute(router);
    registerPackageVersionsRoute(router);
    registerPackageDependentsRoute(router);
    registerPackageStatsRoute(router);
    registerPackageVersionRoute(router);
}
