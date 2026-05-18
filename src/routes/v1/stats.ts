import { packagesCollection, usersCollection, downloadsCollection } from "../../db";
import { Router } from "../../router";
import { json } from "../../utils/json";
import registerPopularStatsRoute from "./stats/popular";

export default function registerStatsRoute(router: Router) {
    registerPopularStatsRoute(router);
    
    router.on("GET", "/v1/stats", async () => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const thirtyDaysStr = thirtyDaysAgo.toISOString().slice(0, 10);

        const [totalPackages, totalUsers, monthlyDownloadsResult, totalDownloadsResult] = await Promise.all([
            packagesCollection.countDocuments(),
            usersCollection.countDocuments(),
            downloadsCollection.aggregate([
                { $match: { day: { $gte: thirtyDaysStr } } },
                { $group: { _id: null, total: { $sum: "$count" } } },
            ]).toArray(),
            downloadsCollection.aggregate([
                { $group: { _id: null, total: { $sum: "$count" } } },
            ]).toArray(),
        ]);

        return json({
            packages: totalPackages,
            users: totalUsers,
            monthlyDownloads: monthlyDownloadsResult[0]?.total || 0,
            totalDownloads: totalDownloadsResult[0]?.total || 0,
        });
    });
}
