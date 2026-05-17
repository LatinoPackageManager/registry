import { packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerSearchRoute(router: Router) {
    router.on("GET", "/v1/search", async (req) => {
        const url = new URL(req.url);
        const query = (url.searchParams.get("q") || "").trim();
        const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
        if (!query) {
            return json({ results: [] });
        }
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const rows = await packagesCollection
            .find({
                $or: [
                    { name: { $regex: regex } },
                    { description: { $regex: regex } },
                    { keywords: { $regex: regex } },
                ],
            }, {
                projection: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    keywords: 1,
                    license: 1,
                    downloadCount: 1,
                    updatedAt: 1,
                },
            })
            .sort({ downloadCount: -1, updatedAt: -1 })
            .limit(limit)
            .toArray();
        
        const results = [];
        for (const row of rows) {
            const latestVersion = await versionsCollection
                .findOne({ packageId: row._id }, {
                    projection: { version: 1, _id: 0 },
                    sort: { createdAt: -1 },
                });
            
            results.push({
                name: row.name,
                description: row.description,
                keywords: row.keywords || [],
                license: row.license,
                downloadCount: row.downloadCount || 0,
                updatedAt: row.updatedAt,
                latestVersion: latestVersion?.version || null,
            });
        }
        
        return json({ results });
    });
}
