import { downloadsCollection, packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";

export default function registerDownloadRoute(router: Router) {
    router.on("GET", "/v1/download/:name/:version", async (_req, params) => {
        const name = params.name?.toLowerCase();
        const { version } = params;
        if (!name || !version) {
            return new Response("invalid download link", { status: 400 });
        }
        const pkg = await packagesCollection.findOne({ name }, { projection: { _id: 1 } });
        if (!pkg) {
            return new Response("not found", { status: 404 });
        }
        const row = await versionsCollection.findOne(
            { packageId: pkg._id, version },
            { projection: { tarballUrl: 1 } }
        );
        if (!row) {
            return new Response("not found", { status: 404 });
        }
        const today = new Date().toISOString().slice(0, 10);
        await Promise.all([
            packagesCollection.updateOne({ _id: pkg._id }, { $inc: { downloadCount: 1 } }),
            versionsCollection.updateOne({ _id: row._id }, { $inc: { downloadCount: 1 } }),
            downloadsCollection.updateOne(
                { packageId: pkg._id, versionId: row._id, day: today },
                {
                    $set: {
                        packageName: name,
                        version,
                        updatedAt: new Date(),
                    },
                    $inc: { count: 1 },
                },
                { upsert: true },
            ),
        ]);
        return Response.redirect(row.tarballUrl, 302);
    });
}
