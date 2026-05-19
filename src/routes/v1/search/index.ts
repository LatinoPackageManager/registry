import { packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerSearchRoute(router: Router) {
    router.on("GET", "/v1/search", async (req) => {
        const url = new URL(req.url);
        const query = (url.searchParams.get("q") || "").trim();
        const limit = Math.min(Number(url.searchParams.get("limit") || 10), 100);
        const page = Math.max(Number(url.searchParams.get("page") || 1), 1);
        const skip = (page - 1) * limit;

        let filter: Record<string, unknown> = {};
        
        if (query) {
            const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter = {
                $or: [
                    { name: { $regex: regex } },
                    { description: { $regex: regex } },
                    { keywords: { $regex: regex } },
                ],
            };
        }

        const total = await packagesCollection.countDocuments(filter);
        
        const rows = await packagesCollection
            .find(filter, {
                projection: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    keywords: 1,
                    license: 1,
                    downloadCount: 1,
                    updatedAt: 1,
                    createdAt: 1,
                },
            })
            .sort({ downloadCount: -1, updatedAt: -1 })
            .skip(skip)
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
                createdAt: row.createdAt,
                latestVersion: latestVersion?.version || null,
            });
        }
        
        return json({ 
            results,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    });
}
