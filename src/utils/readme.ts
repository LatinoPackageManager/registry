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
        const blob = new Blob([new Uint8Array(buf)], { type: "application/zip" });
        const zip = await new Response(blob).blob();
        const entries: Array<{ filename: string; blob: Blob }> = [];
        
        const arrayBuffer = await zip.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        let offset = 0;
        while (offset < uint8Array.length - 4) {
            if (
                uint8Array[offset] === 0x50 &&
                uint8Array[offset + 1] === 0x4b &&
                uint8Array[offset + 2] === 0x03 &&
                uint8Array[offset + 3] === 0x04
            ) {
                const view = new DataView(arrayBuffer, offset);
                const compressionMethod = view.getUint16(8, true);
                const compressedSize = view.getUint32(18, true);
                const fileNameLength = view.getUint16(26, true);
                const extraFieldLength = view.getUint16(28, true);
                
                const fileNameBytes = new Uint8Array(arrayBuffer, offset + 30, fileNameLength);
                const filename = new TextDecoder().decode(fileNameBytes);
                
                const dataStart = offset + 30 + fileNameLength + extraFieldLength;
                const dataBlob = blob.slice(dataStart, dataStart + compressedSize);
                
                entries.push({ filename, blob: dataBlob });
                
                offset = dataStart + compressedSize;
            } else {
                offset++;
            }
        }
        
        for (const pattern of README_PATTERNS) {
            const entry = entries.find(e => {
                const path = e.filename.toLowerCase().replace(/\\/g, "/");
                const filename = path.split("/").pop() || "";
                return filename === pattern.toLowerCase();
            });
            
            if (entry) {
                const content = await new Response(entry.blob).text();
                if (content.trim()) {
                    return content.slice(0, 80_000);
                }
            }
        }
    } catch {
    }
    
    return undefined;
}
