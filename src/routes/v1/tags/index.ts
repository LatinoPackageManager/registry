import { Router } from "../../../router";
import registerPopularTagsRoute from "./popular";

export default function registerTagsRoute(router: Router) {
    registerPopularTagsRoute(router);
}
