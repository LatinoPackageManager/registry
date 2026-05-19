import { downloadsCollection, packagesCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerPopularTagsRoute(router: Router) {
    router.on("GET", "/v1/tags/popular", async (req) => {
        const url = new URL(req.url);
        const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);

        const allPackages = await packagesCollection.find({}, {
            projection: { keywords: 1, downloadCount: 1 },
        }).toArray();

        const tagUsageCount = new Map<string, number>();
        const tagDownloadCount = new Map<string, number>();

        for (const pkg of allPackages) {
            if (pkg.keywords && pkg.keywords.length > 0) {
                const downloadCount = pkg.downloadCount || 0;
                for (const keyword of pkg.keywords) {
                    const tag = keyword.toLowerCase();
                    tagUsageCount.set(tag, (tagUsageCount.get(tag) || 0) + 1);
                    tagDownloadCount.set(tag, (tagDownloadCount.get(tag) || 0) + downloadCount);
                }
            }
        }

        const popularTags = Array.from(tagUsageCount.entries())
            .map(([tag, usageCount]) => ({
                tag,
                usageCount,
                downloadCount: tagDownloadCount.get(tag) || 0,
                score: usageCount * 0.4 + (tagDownloadCount.get(tag) || 0) * 0.0001,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ tag, usageCount, downloadCount }) => ({
                tag,
                count: downloadCount,
                usageCount,
            }));

        return json({ tags: popularTags });
    });
}
