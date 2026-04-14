/**
 * SSE proxy for detection streaming — forwards POST body to backend,
 * returns the SSE stream without buffering.
 */

import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:7001";

export async function POST(request: NextRequest) {
  const body = await request.text();

  const backendResp = await fetch(`${BACKEND_URL}/api/detect/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  if (!backendResp.ok || !backendResp.body) {
    return new Response(await backendResp.text(), {
      status: backendResp.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(backendResp.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
