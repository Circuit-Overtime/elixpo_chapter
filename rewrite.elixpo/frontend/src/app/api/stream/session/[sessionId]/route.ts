/**
 * SSE proxy route — manually streams from the Python backend
 * because Next.js rewrites buffer the response body.
 */

import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:7001";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const backendResp = await fetch(
    `${BACKEND_URL}/api/session/${sessionId}/stream`,
    { cache: "no-store" }
  );

  if (!backendResp.ok || !backendResp.body) {
    return new Response(JSON.stringify({ error: "Backend stream unavailable" }), {
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
