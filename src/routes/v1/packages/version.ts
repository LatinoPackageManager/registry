import { packagesCollection, usersCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";
import { publicProfile } from "../../../utils/profile";

export default function registerPackageVersionRoute(router: Router) {
    router.on("GET", "/v1/packages/:name/:version", async (_req, params) => {
        const name = params.name?.toLowerCase();
        const { version } = params;
        if (!name || !version) {
            return json({ error: "not found" }, { status: 404 });
        }
        const pkg = await packagesCollection.findOne({ name });
        if (!pkg) {
            return json({ error: "not found" }, { status: 404 });
        }
        const owner = await usersCollection.findOne({ _id: pkg.ownerId });
        const row = await versionsCollection.findOne(
            { packageId: pkg._id, version },
            { projection: { version: 1, tarballUrl: 1, shasum: 1, manifest: 1, readme: 1, licenseText: 1, createdAt: 1, downloadCount: 1 } }
        );
        if (!row) {
            return json({ error: "not found" }, { status: 404 });
        }
        return json({
            name,
            version: row.version,
            dist: { tarball: row.tarballUrl, shasum: row.shasum },
            manifest: row.manifest,
            readme: row.readme,
            licenseText: row.licenseText,
            owner: owner ? publicProfile(owner) : null,
            downloadCount: row.downloadCount || 0,
            createdAt: row.createdAt,
        });
    });
}
