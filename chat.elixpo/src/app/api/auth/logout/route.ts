import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}
