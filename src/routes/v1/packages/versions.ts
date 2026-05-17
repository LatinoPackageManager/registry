import semver from "semver";
import { packagesCollection, usersCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";
import { publicProfile } from "../../../utils/profile";

export default function registerPackageVersionsRoute(router: Router) {
    router.on("GET", "/v1/packages/:name", async (_req, params) => {
        const name = params.name?.toLowerCase();
        if (!name) {
            return json({ name, versions: [] });
        }
        const pkg = await packagesCollection.findOne({ name });
        if (!pkg) {
            return json({ name, versions: [] });
        }
        const owner = await usersCollection.findOne({ _id: pkg.ownerId });
        const rows = await versionsCollection
            .find({ packageId: pkg._id }, { projection: { version: 1, tarballUrl: 1, shasum: 1, manifest: 1, createdAt: 1, downloadCount: 1 } })
            .sort({ createdAt: -1 })
            .toArray();
        const latestVersion = semver.rsort(rows.map((row) => row.version).filter((version) => semver.valid(version)))[0];
        const latest = rows.find((row) => row.version === latestVersion) || rows[0];
        return json({
            name,
            description: pkg.description,
            keywords: pkg.keywords || [],
            license: pkg.license,
            repository: pkg.repository,
            homepage: pkg.homepage,
            readme: pkg.readme,
            owner: owner ? publicProfile(owner) : null,
            latest: latest ? {
                version: latest.version,
                manifest: latest.manifest,
            } : null,
            downloadCount: pkg.downloadCount || 0,
            createdAt: pkg.createdAt,
            updatedAt: pkg.updatedAt,
            versions: rows.map((row) => ({
                version: row.version,
                dist: { tarball: row.tarballUrl, shasum: row.shasum },
                manifest: row.manifest,
                downloadCount: row.downloadCount || 0,
                createdAt: row.createdAt,
            })),
        });
    });
}
