import unzipper from "unzipper";

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
