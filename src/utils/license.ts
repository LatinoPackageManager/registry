import unzipper from "unzipper";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

const gunzipAsync = promisify(gunzip);

const LICENSE_PATTERNS = [
    "license",
    "licence",
    "copying",
];

const LICENSE_EXTENSIONS = [
    ".md",
    ".txt",
    "",
];

export async function extractLicenseFromZip(buf: Buffer): Promise<string | undefined> {
    try {
        const directory = await unzipper.Open.buffer(buf);
        
        for (const entry of directory.files) {
            const path = entry.path.toLowerCase().replace(/\\/g, "/");
            const filename = path.split("/").pop() || "";
            
            for (const pattern of LICENSE_PATTERNS) {
                for (const ext of LICENSE_EXTENSIONS) {
                    const expectedName = pattern + ext;
                    if (filename === expectedName || filename.startsWith(`${pattern}.`) || filename.startsWith(`${pattern}_`)) {
                        const content = await entry.buffer();
                        const text = content.toString("utf-8");
                        if (text.trim()) {
                            return text.slice(0, 80_000);
                        }
                    }
                }
            }
        }
    } catch {
    }
    
    return undefined;
}

export async function extractLicenseFromTarball(buf: Buffer): Promise<string | undefined> {
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
                
                for (const pattern of LICENSE_PATTERNS) {
                    for (const ext of LICENSE_EXTENSIONS) {
                        const expectedName = pattern + ext;
                        if (basename === expectedName || basename.startsWith(`${pattern}.`) || basename.startsWith(`${pattern}_`)) {
                            const contentStart = offset + 512;
                            const contentBytes = tarData.slice(contentStart, contentStart + size);
                            const text = new TextDecoder().decode(contentBytes).trim();
                            if (text) {
                                return text.slice(0, 80_000);
                            }
                        }
                    }
                }
            }
            
            offset += 512 + Math.ceil(size / 512) * 512;
        }
    } catch {
    }
    
    return undefined;
}
