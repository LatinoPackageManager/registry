import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET } from "../config";

export const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

export async function getR2Object(key: string) {
    try {
        const response = await s3.send(new GetObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
        }));
        return response.Body;
    } catch {
        return null;
    }
}
