import { MongoClient, ObjectId, type Collection } from "mongodb";
import { MONGO_DB_NAME, MONGO_SERVER_SELECTION_TIMEOUT_MS, MONGO_URI } from "./config";

interface UserSchema {
    email: string;
    passwordHash: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    website?: string;
    github?: string;
    createdAt: Date;
    updatedAt?: Date;
}

interface PackageSchema {
    name: string;
    ownerId: ObjectId;
    description?: string;
    keywords?: string[];
    license?: string;
    repository?: string;
    homepage?: string;
    readme?: string;
    downloadCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

interface VersionSchema {
    packageId: ObjectId;
    version: string;
    tarballUrl: string;
    shasum: string;
    manifest: Record<string, unknown>;
    downloadCount?: number;
    createdAt: Date;
}

interface DownloadSchema {
    packageId: ObjectId;
    versionId: ObjectId;
    packageName: string;
    version: string;
    day: string;
    count: number;
    updatedAt: Date;
}

export type UserDocument = UserSchema & { _id: ObjectId };
export type PackageDocument = PackageSchema & { _id: ObjectId };
export type VersionDocument = VersionSchema & { _id: ObjectId };
export type DownloadDocument = DownloadSchema & { _id: ObjectId };

const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: MONGO_SERVER_SELECTION_TIMEOUT_MS,
});
try {
    await client.connect();
} catch (error) {
    console.error("MongoDB connection failed. Check MONGO_URI, network access, TLS support, and Atlas IP allowlist.");
    console.error(error);
    process.exit(1);
}

const db = client.db(MONGO_DB_NAME);

export const usersCollection: Collection<UserSchema> = db.collection("users");
export const packagesCollection: Collection<PackageSchema> = db.collection("packages");
export const versionsCollection: Collection<VersionSchema> = db.collection("versions");
export const downloadsCollection: Collection<DownloadSchema> = db.collection("downloads");

await Promise.all([
    usersCollection.createIndex({ email: 1 }, { unique: true }),
    usersCollection.createIndex(
        { username: 1 },
        { unique: true, partialFilterExpression: { username: { $type: "string" } } },
    ),
    packagesCollection.createIndex({ name: 1 }, { unique: true }),
    packagesCollection.createIndex({ ownerId: 1, updatedAt: -1 }),
    packagesCollection.createIndex({
        name: "text",
        description: "text",
        keywords: "text",
    }),
    versionsCollection.createIndex({ packageId: 1, version: 1 }, { unique: true }),
    versionsCollection.createIndex({ packageId: 1, createdAt: -1 }),
    versionsCollection.createIndex({ "manifest.dependencies": 1 }),
    downloadsCollection.createIndex({ packageId: 1, version: 1, day: -1 }),
    downloadsCollection.createIndex({ packageId: 1, versionId: 1, day: 1 }, { unique: true }),
]);

export { ObjectId };
