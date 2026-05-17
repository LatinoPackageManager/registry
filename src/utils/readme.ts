import unzipper from "unzipper";

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
