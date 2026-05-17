import { packagesCollection, usersCollection, downloadsCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerStatsRoute(router: Router) {
    router.on("GET", "/v1/stats", async () => {
        const [totalPackages, totalUsers, totalDownloads] = await Promise.all([
            packagesCollection.countDocuments(),
            usersCollection.countDocuments(),
            downloadsCollection.aggregate([
                { $group: { _id: null, total: { $sum: "$count" } } },
            ]).toArray(),
        ]);

        return json({
            packages: totalPackages,
            users: totalUsers,
            downloads: totalDownloads[0]?.total || 0,
        });
    });
}
