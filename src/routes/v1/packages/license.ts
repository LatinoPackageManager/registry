import { packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { getR2Object } from "../../../services/r2";
import { R2_BUCKET } from "../../../config";

export default function registerPackageLicenseRoute(router: Router) {
    router.on("GET", "/v1/packages/:name/license", async (_req, params) => {
        const name = params.name?.toLowerCase();
        if (!name) {
            return new Response("not found", { status: 404 });
        }
        
        const pkg = await packagesCollection.findOne({ name });
        if (!pkg) {
            return new Response("not found", { status: 404 });
        }
        
        const latestVersion = await versionsCollection.findOne(
            { packageId: pkg._id },
            { sort: { createdAt: -1 } }
        );
        
        if (!latestVersion) {
            return new Response("not found", { status: 404 });
        }
        
        const r2Key = `${name}/LICENSE.md`;
        
        try {
            const r2Object = await getR2Object(r2Key);
            if (r2Object) {
                const body = Buffer.from(await (r2Object as any).transformToByteArray());
                return new Response(body, {
                    headers: {
                        "Content-Type": "text/markdown",
                        "Cache-Control": "public, max-age=3600",
                    },
                });
            }
        } catch {}
        
        if (latestVersion.licenseText) {
            return new Response(latestVersion.licenseText, {
                headers: {
                    "Content-Type": "text/markdown",
                    "Cache-Control": "public, max-age=3600",
                },
            });
        }
        
        return new Response("not found", { status: 404 });
    });
}
