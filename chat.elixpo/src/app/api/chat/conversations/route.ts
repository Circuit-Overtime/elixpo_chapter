import { NextRequest } from "next/server";
import { listConversations, deleteConversation } from "@/lib/chat/db";

const DUMMY_USER_ID = "user_123"; // TODO: Replace with auth

export async function GET(req: NextRequest) {
  try {
    const conversations = await listConversations(DUMMY_USER_ID);
    return new Response(JSON.stringify(conversations), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });
    
    await deleteConversation(id);
    return new Response(JSON.stringify({ success: true }));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
