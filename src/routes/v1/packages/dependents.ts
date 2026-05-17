import { ObjectId, packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerPackageDependentsRoute(router: Router) {
    router.on("GET", "/v1/packages/:name/dependents", async (_req, params) => {
        const { name } = params;
        if (!name) {
            return json({ name, dependents: [] });
        }

        const rows = await versionsCollection
            .find(
                { [`manifest.dependencies.${name}`]: { $exists: true } },
                { projection: { version: 1, manifest: 1, packageId: 1 } },
            )
            .toArray();

        const packageIds = [...new Set(rows.map((row) => row.packageId.toString()))];
        const packages = await packagesCollection
            .find({ _id: { $in: packageIds.map((id) => new ObjectId(id)) } }, { projection: { name: 1 } })
            .toArray();
        const namesById = new Map(packages.map((pkg) => [pkg._id.toString(), pkg.name]));

        return json({
            name,
            dependents: rows.map((row) => ({
                name: namesById.get(row.packageId.toString()) || "(unknown)",
                version: row.version,
                range: String((row.manifest?.dependencies as Record<string, unknown> | undefined)?.[name] || "*"),
            })),
        });
    });
}
