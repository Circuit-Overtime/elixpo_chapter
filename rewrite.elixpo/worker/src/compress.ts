/**
 * Heavy compression for document storage using CompressionStream (gzip).
 * All documents are gzip-compressed before being written to D1 as BLOBs.
 */

/** Compress a string to gzip bytes */
export async function compress(text: string): Promise<Uint8Array> {
	const encoder = new TextEncoder();
	const stream = new Blob([encoder.encode(text)])
		.stream()
		.pipeThrough(new CompressionStream("gzip"));
	const buf = await new Response(stream).arrayBuffer();
	return new Uint8Array(buf);
}

/** Decompress gzip bytes back to a string */
export async function decompress(data: ArrayBuffer | Uint8Array): Promise<string> {
	const stream = new Blob([data])
		.stream()
		.pipeThrough(new DecompressionStream("gzip"));
	return new Response(stream).text();
}

/** SHA-256 hex checksum of a string */
export async function sha256(text: string): Promise<string> {
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(text));
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
