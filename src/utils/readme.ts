import unzipper from "unzipper";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

const gunzipAsync = promisify(gunzip);

const README_PATTERNS = [
    "readme.md",
    "README.md",
    "Readme.md",
    "README.MD",
    "README",
    "readme",
    "Readme",
    "README.txt",
    "readme.txt",
];

export async function extractReadmeFromZip(buf: Buffer): Promise<string | undefined> {
    try {
        const directory = await unzipper.Open.buffer(buf);
        
        for (const entry of directory.files) {
            const path = entry.path.toLowerCase().replace(/\\/g, "/");
            const filename = path.split("/").pop() || "";
            
            if (README_PATTERNS.some(pattern => pattern.toLowerCase() === filename)) {
                const content = await entry.buffer();
                const text = content.toString("utf-8");
                if (text.trim()) {
                    return text.slice(0, 80_000);
                }
            }
        }
    } catch {
    }
    
    return undefined;
}

export async function extractReadmeFromTarball(buf: Buffer): Promise<string | undefined> {
    try {
        const decompressed = await gunzipAsync(buf);
        const tarData = new Uint8Array(decompressed);
        
        let offset = 0;
        while (offset < tarData.length - 512) {
            const header = tarData.slice(offset, offset + 512);
            const nameBytes = header.slice(0, 100);
            const nameEnd = nameBytes.indexOf(0);
            const name = new TextDecoder().decode(nameBytes.slice(0, nameEnd === -1 ? 100 : nameEnd));
            
            const sizeBytes = header.slice(124, 136);
            const sizeStr = new TextDecoder().decode(sizeBytes).replace(/\0/g, "").trim();
            const size = parseInt(sizeStr, 8);
            
            if (name && !isNaN(size)) {
                const basename = name.split("/").pop()?.toLowerCase() || "";
                if (README_PATTERNS.some(pattern => pattern.toLowerCase() === basename)) {
                    const contentStart = offset + 512;
                    const contentBytes = tarData.slice(contentStart, contentStart + size);
                    const text = new TextDecoder().decode(contentBytes).trim();
                    if (text) {
                        return text.slice(0, 80_000);
                    }
                }
            }
            
            offset += 512 + Math.ceil(size / 512) * 512;
        }
    } catch {
    }
    
    return undefined;
}
