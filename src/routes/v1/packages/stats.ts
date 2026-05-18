import { downloadsCollection, packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerPackageStatsRoute(router: Router) {
    router.on("GET", "/v1/packages/:name/stats", async (req, params) => {
        const name = params.name?.toLowerCase();
        if (!name) return json({ error: "not found" }, { status: 404 });

        const pkg = await packagesCollection.findOne({ name }, { projection: { _id: 1, downloadCount: 1 } });
        if (!pkg) return json({ error: "not found" }, { status: 404 });

        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const [versions, dailyResult, weeklyResult, monthlyResult, yearlyResult] = await Promise.all([
            versionsCollection
                .find({ packageId: pkg._id }, { projection: { version: 1, downloadCount: 1 } })
                .sort({ createdAt: -1 })
                .toArray(),
            downloadsCollection
                .find({ packageId: pkg._id, day: today }, { projection: { version: 1, count: 1 } })
                .toArray(),
            downloadsCollection
                .aggregate([
                    { $match: { packageId: pkg._id, day: { $gte: weekAgo } } },
                    { $group: { _id: "$version", count: { $sum: "$count" } } },
                ])
                .toArray() as Promise<{ _id: string; count: number }[]>,
            downloadsCollection
                .aggregate([
                    { $match: { packageId: pkg._id, day: { $gte: monthAgo } } },
                    { $group: { _id: "$version", count: { $sum: "$count" } } },
                ])
                .toArray() as Promise<{ _id: string; count: number }[]>,
            downloadsCollection
                .aggregate([
                    { $match: { packageId: pkg._id, day: { $gte: yearAgo } } },
                    { $group: { _id: "$version", count: { $sum: "$count" } } },
                ])
                .toArray() as Promise<{ _id: string; count: number }[]>,
        ]);

        const sumCounts = (rows: { count: number }[]) => rows.reduce((sum, r) => sum + r.count, 0);

        return json({
            name,
            downloadCount: {
                total: pkg.downloadCount || 0,
                daily: sumCounts(dailyResult),
                weekly: sumCounts(weeklyResult),
                monthly: sumCounts(monthlyResult),
                yearly: sumCounts(yearlyResult),
            },
            versions: versions.map((row) => ({
                version: row.version,
                downloadCount: row.downloadCount || 0,
            })),
        });
    });
}
