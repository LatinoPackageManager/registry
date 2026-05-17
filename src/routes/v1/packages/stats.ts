import { downloadsCollection, packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerPackageStatsRoute(router: Router) {
    router.on("GET", "/v1/packages/:name/stats", async (req, params) => {
        const name = params.name?.toLowerCase();
        if (!name) return json({ error: "not found" }, { status: 404 });

        const url = new URL(req.url);
        const days = Math.min(Number(url.searchParams.get("days") || 30), 365);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const pkg = await packagesCollection.findOne({ name }, { projection: { _id: 1, downloadCount: 1 } });
        if (!pkg) return json({ error: "not found" }, { status: 404 });

        const [versions, daily] = await Promise.all([
            versionsCollection
                .find({ packageId: pkg._id }, { projection: { version: 1, downloadCount: 1 } })
                .sort({ createdAt: -1 })
                .toArray(),
            downloadsCollection
                .find({ packageId: pkg._id, day: { $gte: since } }, { projection: { day: 1, version: 1, count: 1 } })
                .sort({ day: 1 })
                .toArray(),
        ]);

        return json({
            name,
            downloadCount: pkg.downloadCount || 0,
            versions: versions.map((row) => ({
                version: row.version,
                downloadCount: row.downloadCount || 0,
            })),
            daily: daily.map((row) => ({
                day: row.day,
                version: row.version,
                count: row.count,
            })),
        });
    });
}
