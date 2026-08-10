import { redirect } from "next/navigation";

export default function LegacySessionPage() {
  redirect("/runs");
}
