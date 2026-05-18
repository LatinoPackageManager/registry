import { downloadsCollection, packagesCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerPopularStatsRoute(router: Router) {
    router.on("GET", "/v1/stats/popular", async (req) => {
        const url = new URL(req.url);
        const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
        
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekAgoStr = weekAgo.toISOString().slice(0, 10);

        const weeklyDownloads = await downloadsCollection.aggregate([
            { $match: { day: { $gte: weekAgoStr } } },
            { $group: { _id: "$packageId", weeklyDownloads: { $sum: "$count" } } },
            { $sort: { weeklyDownloads: -1 } },
            { $limit: limit },
        ]).toArray();

        if (weeklyDownloads.length === 0) {
            return json({ packages: [], tags: [] });
        }

        const packageIds = weeklyDownloads.map((d) => d._id);
        const packages = await packagesCollection.find({ _id: { $in: packageIds } }).toArray();
        const packageMap = new Map(packages.map((p) => [p._id.toString(), p]));

        const popularPackages = weeklyDownloads.map((d) => {
            const pkg = packageMap.get(d._id.toString());
            return {
                name: pkg?.name || "unknown",
                description: pkg?.description,
                keywords: pkg?.keywords || [],
                weeklyDownloads: d.weeklyDownloads,
                totalDownloads: pkg?.downloadCount || 0,
            };
        }).filter((p) => p.name !== "unknown");

        const tagCounts = new Map<string, number>();
        for (const pkg of packages) {
            if (pkg.keywords && pkg.keywords.length > 0) {
                for (const keyword of pkg.keywords) {
                    const tag = keyword.toLowerCase();
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + (pkg.downloadCount || 0));
                }
            }
        }

        const popularTags = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([tag, count]) => ({ tag, count }));

        return json({
            packages: popularPackages,
            tags: popularTags,
        });
    });
}
