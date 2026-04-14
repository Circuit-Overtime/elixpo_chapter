import { NextRequest, NextResponse } from "next/server";

const SEARCH_BASE = "https://search.elixpo.com";
const API_KEY = process.env.ELIXSEARCH_API_KEY || "";

/**
 * Proxy all chat requests to search.elixpo.com to avoid CORS.
 * POST /api/chat — proxies to /v1/chat/completions (supports SSE)
 * GET /api/chat?action=create_session — proxies session create
 * GET /api/chat?action=get_session&session_id=X — proxies session get
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const isStream = body.stream === true;

  const upstream = await fetch(`${SEARCH_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return NextResponse.json({ error: err }, { status: upstream.status });
  }

  if (isStream && upstream.body) {
    // Forward SSE stream
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const data = await upstream.json();
  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const sessionId = searchParams.get("session_id");

  let url: string;
  if (action === "create_session") {
    url = `${SEARCH_BASE}/api/session/create`;
  } else if (action === "get_session" && sessionId) {
    url = `${SEARCH_BASE}/api/session/${sessionId}`;
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const upstream = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return NextResponse.json({ error: err }, { status: upstream.status });
  }

  const data = await upstream.json();
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  await fetch(`${SEARCH_BASE}/api/session/${sessionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  return NextResponse.json({ ok: true });
}
