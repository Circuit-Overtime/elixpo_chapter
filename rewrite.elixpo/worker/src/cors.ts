export const corsHeaders: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-ID, X-User-ID",
	"Access-Control-Expose-Headers": "X-Session-ID",
	"Access-Control-Max-Age": "86400",
};

export function handleOptions(): Response {
	return new Response(null, { status: 204, headers: corsHeaders });
}
