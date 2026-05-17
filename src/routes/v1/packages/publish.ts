import { PutObjectCommand } from "@aws-sdk/client-s3";
import { ObjectId, packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { s3 } from "../../../services/r2";
import { R2_BUCKET, R2_ENDPOINT, R2_PUBLIC_URL } from "../../../config";
import { json } from "../../../utils/json";
import { getAuthUser } from "../../../utils/auth";
import { normalizeManifest } from "../../../utils/manifest";
import { extractReadmeFromZip } from "../../../utils/readme";

const MAX_PACKAGE_BYTES = Number(process.env.MAX_PACKAGE_BYTES || 25 * 1024 * 1024);

export default function registerPublishRoute(router: Router) {
    router.on("POST", "/v1/packages/:name/:version", async (req, params) => {
        const user = await getAuthUser(req);
        if (!user) return json({ error: "no auth" }, { status: 401 });

        const name = params.name?.toLowerCase();
        const version = params.version;
        if (!name || !version) {
            return json({ error: "nombre y version requeridos" }, { status: 400 });
        }

        const form = await req.formData();
        let parsedMeta: unknown = {};
        try {
            parsedMeta = JSON.parse(String(form.get("meta")) || "{}");
        } catch {
            return json({ error: "meta debe ser JSON valido" }, { status: 400 });
        }

        const { manifest: meta, errors } = normalizeManifest(parsedMeta, name, version);
        if (errors.length > 0) {
            return json({ error: "manifest invalido", details: errors }, { status: 400 });
        }

        const file = form.get("file") as unknown as File | null;
        const sha256 = String(form.get("sha256") || "");
        if (!file) return json({ error: "file requerido" }, { status: 400 });
        if (file.size > MAX_PACKAGE_BYTES) {
            return json({ error: `archivo demasiado grande, max ${MAX_PACKAGE_BYTES} bytes` }, { status: 413 });
        }

        const buf = Buffer.from(await file.arrayBuffer());
        const real = new Bun.SHA256().update(buf).digest("hex");
        if (real !== sha256) {
            return json({ error: "sha256 invalido" }, { status: 400 });
        }

        let readme = meta.readme;
        if (!readme) {
            readme = await extractReadmeFromZip(buf);
        }

        const now = new Date();
        let pkg = await packagesCollection.findOne({ name });
        if (!pkg) {
            const ownerId = new ObjectId(user.id);
            const insert = await packagesCollection.insertOne({
                name,
                ownerId: new ObjectId(user.id),
                description: meta.description,
                keywords: meta.keywords,
                license: meta.license,
                repository: meta.repository,
                homepage: meta.homepage,
                readme,
                downloadCount: 0,
                createdAt: now,
                updatedAt: now,
            });
            pkg = {
                _id: insert.insertedId,
                name,
                ownerId,
                description: meta.description,
                keywords: meta.keywords,
                license: meta.license,
                repository: meta.repository,
                homepage: meta.homepage,
                readme,
                downloadCount: 0,
                createdAt: now,
                updatedAt: now,
            };
        } else if (pkg.ownerId.toString() !== user.id) {
            return json({ error: "no eres owner" }, { status: 403 });
        }

        const exists = await versionsCollection.findOne({ packageId: pkg._id, version });
        if (exists) {
            return json({ error: "version ya publicada" }, { status: 409 });
        }
        if (!R2_ENDPOINT) {
            return json({ error: "R2_ENDPOINT no configurado" }, { status: 500 });
        }

        const r2Key = `${name}/${version}.zip`;
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: buf,
            ContentType: "application/zip",
        }));
        const tarball = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${r2Key}`;
        await versionsCollection.insertOne({
            packageId: pkg._id,
            version,
            tarballUrl: tarball,
            shasum: sha256,
            manifest: meta,
            readme,
            downloadCount: 0,
            createdAt: now,
        });
        await packagesCollection.updateOne({ _id: pkg._id }, {
            $set: {
                description: meta.description,
                keywords: meta.keywords,
                license: meta.license,
                repository: meta.repository,
                homepage: meta.homepage,
                readme,
                updatedAt: now,
            },
        });

        return json({ ok: true, name, version, tarball });
    });
}
