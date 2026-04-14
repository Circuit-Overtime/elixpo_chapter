import { NextRequest } from "next/server";

const IMAGE_KEY = "45e79d739c635215c56550a50e041f8ffba3a6ee2e79a9be1421c23eb193f23a";

/**
 * GET /api/image?id=<uuid>
 * Proxies the image from search.elixpo.com with the API key so the key stays server-side.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });

  const upstream = await fetch(
    `https://search.elixpo.com/api/image/${id}?key=${IMAGE_KEY}`,
    { signal: AbortSignal.timeout(15000) }
  );

  if (!upstream.ok) {
    return new Response("Image not found", { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") || "image/png";
  const body = upstream.body;

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
