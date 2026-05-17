import { packagesCollection } from "../../../db";
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
        return json({
            results: rows.map((row) => ({
                name: row.name,
                description: row.description,
                keywords: row.keywords || [],
                license: row.license,
                downloadCount: row.downloadCount || 0,
                updatedAt: row.updatedAt,
            })),
        });
    });
}
