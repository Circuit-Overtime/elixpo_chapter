"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DailyRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/news"); }, [router]);
  return null;
}
