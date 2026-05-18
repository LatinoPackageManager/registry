import { PutObjectCommand } from "@aws-sdk/client-s3";
import { ObjectId, packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { s3 } from "../../../services/r2";
import { R2_BUCKET, R2_ENDPOINT, R2_PUBLIC_URL } from "../../../config";
import { json } from "../../../utils/json";
import { getAuthUser } from "../../../utils/auth";
import { normalizeManifest } from "../../../utils/manifest";
import { extractReadmeFromZip } from "../../../utils/readme";
import { extractLicenseFromZip } from "../../../utils/license";
import { extractReadmeFromTarball } from "../../../utils/readme";
import { extractLicenseFromTarball } from "../../../utils/license";

const MAX_PACKAGE_BYTES = Number(process.env.MAX_PACKAGE_BYTES || 25 * 1024 * 1024);

function detectArchiveFormat(file: File): "tarball" | "zip" {
    if (file.name.endsWith(".tar.gz") || file.name.endsWith(".tgz")) {
        return "tarball";
    }
    if (file.name.endsWith(".zip")) {
        return "zip";
    }
    const contentType = file.type.toLowerCase();
    if (contentType.includes("gzip") || contentType.includes("tar")) {
        return "tarball";
    }
    if (contentType.includes("zip")) {
        return "zip";
    }
    return "zip";
}

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
        const format = String(form.get("format") || "auto");
        if (!file) return json({ error: "file requerido" }, { status: 400 });
        if (file.size > MAX_PACKAGE_BYTES) {
            return json({ error: `archivo demasiado grande, max ${MAX_PACKAGE_BYTES} bytes` }, { status: 413 });
        }

        const buf = Buffer.from(await file.arrayBuffer());
        const real = new Bun.SHA256().update(buf).digest("hex");
        if (real !== sha256) {
            return json({ error: "sha256 invalido" }, { status: 400 });
        }

        const detectedFormat = format === "auto" ? detectArchiveFormat(file) : (format as "tarball" | "zip");
        const ext = detectedFormat === "tarball" ? ".tar.gz" : ".zip";
        const contentType = detectedFormat === "tarball" ? "application/gzip" : "application/zip";

        let readme: string | undefined = typeof meta.readme === "string" ? meta.readme : undefined;
        let licenseText: string | undefined = typeof meta.licenseText === "string" ? meta.licenseText : undefined;
        
        if (detectedFormat === "zip") {
            if (!readme) {
                readme = await extractReadmeFromZip(buf);
            }
            if (!licenseText) {
                licenseText = await extractLicenseFromZip(buf);
            }
        } else if (detectedFormat === "tarball") {
            if (!readme) {
                readme = await extractReadmeFromTarball(buf);
            }
            if (!licenseText) {
                licenseText = await extractLicenseFromTarball(buf);
            }
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
                readme: readme,
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
                readme: readme,
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

        const r2Key = `${name}/${version}${ext}`;
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: buf,
            ContentType: contentType,
        }));
        const tarball = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${r2Key}`;
        
        if (licenseText) {
            const licenseKey = `${name}/LICENSE.md`;
            await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: licenseKey,
                Body: Buffer.from(String(licenseText), "utf-8"),
                ContentType: "text/markdown",
            }));
        }
        
        await versionsCollection.insertOne({
            packageId: pkg._id,
            version,
            tarballUrl: tarball,
            shasum: sha256,
            manifest: meta,
            readme,
            licenseText,
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
                readme: readme,
                updatedAt: now,
            },
        });

        return json({ ok: true, name, version, tarball });
    });
}
