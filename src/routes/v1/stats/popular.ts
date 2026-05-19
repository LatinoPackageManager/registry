import { downloadsCollection, packagesCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerPopularStatsRoute(router: Router) {
    router.on("GET", "/v1/stats/popular", async (req) => {
        const url = new URL(req.url);
        const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
        
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        let popularPackageIds: { _id: unknown; downloads: number }[] = [];

        const weeklyDownloads = await downloadsCollection.aggregate<{ _id: string; downloads: number }>([
            { $match: { day: { $gte: weekAgo } } },
            { $group: { _id: "$packageId", downloads: { $sum: "$count" } } },
            { $sort: { downloads: -1 } },
            { $limit: limit },
        ]).toArray();

        if (weeklyDownloads.length > 0) {
            popularPackageIds = weeklyDownloads.map((d) => ({ _id: d._id, downloads: d.downloads }));
        } else {
            const monthlyDownloads = await downloadsCollection.aggregate<{ _id: string; downloads: number }>([
                { $match: { day: { $gte: monthAgo } } },
                { $group: { _id: "$packageId", downloads: { $sum: "$count" } } },
                { $sort: { downloads: -1 } },
                { $limit: limit },
            ]).toArray();

            if (monthlyDownloads.length > 0) {
                popularPackageIds = monthlyDownloads.map((d) => ({ _id: d._id, downloads: d.downloads }));
            } else {
                const yearlyDownloads = await downloadsCollection.aggregate<{ _id: string; downloads: number }>([
                    { $match: { day: { $gte: yearAgo } } },
                    { $group: { _id: "$packageId", downloads: { $sum: "$count" } } },
                    { $sort: { downloads: -1 } },
                    { $limit: limit },
                ]).toArray();

                if (yearlyDownloads.length > 0) {
                    popularPackageIds = yearlyDownloads.map((d) => ({ _id: d._id, downloads: d.downloads }));
                } else {
                    const recentPackages = await packagesCollection.find({}, {
                        projection: { _id: 1 },
                        sort: { createdAt: -1 },
                        limit,
                    }).toArray();
                    popularPackageIds = recentPackages.map((p) => ({ _id: p._id, downloads: 0 }));
                }
            }
        }

        if (popularPackageIds.length === 0) {
            return json({ packages: [], tags: [] });
        }

        const packageIds = popularPackageIds.map((d) => d._id) as import("mongodb").ObjectId[];
        const packages = await packagesCollection.find({ _id: { $in: packageIds } }).toArray();
        const packageMap = new Map(packages.map((p) => [p._id.toString(), p]));
        const downloadsMap = new Map(popularPackageIds.map((d) => [String(d._id), d.downloads]));

        const popularPackages = popularPackageIds.map((d) => {
            const pkg = packageMap.get(String(d._id));
            if (!pkg) return null;
            return {
                name: pkg.name,
                description: pkg.description,
                keywords: pkg.keywords || [],
                weeklyDownloads: downloadsMap.get(String(d._id)) || pkg.downloadCount || 0,
                totalDownloads: pkg.downloadCount || 0,
            };
        }).filter((p): p is NonNullable<typeof p> => p !== null && p.name !== "unknown");

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
