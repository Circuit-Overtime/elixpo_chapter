/**
 * Detection routes — proxy to Python backend.
 * Detection is fast (no background job needed), so we proxy directly.
 */

import type { Env } from "../index";
import { json } from "../index";

export async function handleDetect(request: Request, env: Env): Promise<Response> {
	const body = await request.json();
	const resp = await fetch(`${env.BACKEND_URL}/api/detect`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = await resp.json();
	return json(data, resp.status);
}

export async function handleDetectFile(request: Request, env: Env): Promise<Response> {
	// Forward the multipart form directly to the backend
	const resp = await fetch(`${env.BACKEND_URL}/api/detect/file`, {
		method: "POST",
		body: request.body,
		headers: {
			"Content-Type": request.headers.get("Content-Type") || "multipart/form-data",
		},
	});
	const data = await resp.json();
	return json(data, resp.status);
}
