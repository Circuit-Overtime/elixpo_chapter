"use client";

/**
 * accounts.elixpo#80 — device verification/consent page.
 *
 * STYLING ASSUMPTION (flagged, not confirmed): this uses Tailwind utility
 * classes. Nothing in the #79/#80 handoff confirmed the repo's actual
 * styling system — if this codebase uses CSS modules, shadcn/ui
 * components, or something else, swap the JSX below accordingly; the
 * data flow and state logic doesn't depend on Tailwind specifically.
 *
 * Data flow:
 * 1. GET /api/auth/device/lookup?user_code=... (public, rate-limited,
 *    already built by #79) — resolves the code to client/scope/expiry
 *    details, or a collapsed not_found/expired 404.
 * 2. User clicks Approve/Deny -> POST /api/auth/device/{approve,deny}
 *    with { user_code }. These routes require the access_token cookie;
 *    a 401 here means "not logged in", not "bad code" — redirect to
 *    /login preserving this exact URL (including ?user_code=...) as
 *    `next`, so login and account-switching both land back on the same
 *    pending request rather than losing it.
 * 3. The verification link (verification_uri_complete) only ever
 *    prefills the input via ?user_code= — it never calls approve/deny
 *    on its own. Loading this page performs a read-only lookup and
 *    nothing else; approval always requires an explicit, separate click.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
    isHighImpactScope,
    LIXBLOGS_SCOPE_DETAILS,
} from "@/lib/lixblogs-scopes";

interface LookupResult {
    status: "pending" | "approved" | "denied" | "expired" | "not_found";
    client_id?: string;
    client_name?: string;
    scopes?: string[];
    expires_at?: string;
}

type ViewState =
    | { phase: "entering" }
    | { phase: "loading" }
    | { phase: "ready"; details: LookupResult }
    | { phase: "error"; message: string }
    | { phase: "resolved"; outcome: "approved" | "denied" };

function currentUrlForNext(userCode: string): string {
    const params = new URLSearchParams();
    if (userCode) params.set("user_code", userCode);
    const qs = params.toString();
    return `/device${qs ? `?${qs}` : ""}`;
}

function DeviceVerificationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const prefill = searchParams.get("user_code") || "";

    const [userCode, setUserCode] = useState(prefill);
    const [view, setView] = useState<ViewState>({ phase: "entering" });

    const doLookup = useCallback(async (rawCode: string) => {
        setView({ phase: "loading" });
        try {
            const res = await fetch(
                `/api/auth/device/lookup?user_code=${encodeURIComponent(rawCode)}`,
            );
            if (res.status === 404) {
                setView({
                    phase: "error",
                    message:
                        "That code is incorrect or has expired. Please check your device and try again.",
                });
                return;
            }
            if (res.status === 429) {
                setView({
                    phase: "error",
                    message:
                        "Too many attempts. Please wait a moment and try again.",
                });
                return;
            }
            if (!res.ok) {
                setView({
                    phase: "error",
                    message: "Something went wrong. Please try again.",
                });
                return;
            }
            const details: LookupResult = await res.json();
            if (details.status !== "pending") {
                setView({
                    phase: "error",
                    message: "This code has already been used.",
                });
                return;
            }
            setView({ phase: "ready", details });
        } catch {
            setView({
                phase: "error",
                message: "Couldn't reach the server. Please try again.",
            });
        }
    }, []);

    // Auto-lookup when arriving via verification_uri_complete (?user_code=...).
    // Read-only — does not approve or deny anything.
    useEffect(() => {
        if (prefill) {
            void doLookup(prefill);
        }
    }, [prefill, doLookup]);

    function handleSubmitCode(e: React.FormEvent) {
        e.preventDefault();
        if (userCode.trim().length > 0) {
            void doLookup(userCode.trim());
        }
    }

    async function resolve(action: "approve" | "deny") {
        setView({ phase: "loading" });
        try {
            const res = await fetch(`/api/auth/device/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_code: userCode }),
            });

            if (res.status === 401) {
                // Not logged in (or session expired mid-flow) — preserve
                // this exact pending request across login/account switch.
                router.push(
                    `/login?next=${encodeURIComponent(currentUrlForNext(userCode))}`,
                );
                return;
            }

            if (!res.ok) {
                const body = (await res.json().catch(() => ({}))) as {
                    error_description?: string;
                };
                setView({
                    phase: "error",
                    message:
                        body.error_description ||
                        "This request could not be completed.",
                });
                return;
            }

            setView({
                phase: "resolved",
                outcome: action === "approve" ? "approved" : "denied",
            });
        } catch {
            setView({
                phase: "error",
                message: "Couldn't reach the server. Please try again.",
            });
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-6 py-12">
            <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
                {view.phase === "entering" || view.phase === "loading" ? (
                    <>
                        <p className="text-xs font-mono uppercase tracking-wide text-[var(--fg-faint)] mb-2">
                            Device sign-in
                        </p>
                        <h1 className="text-xl font-semibold text-[var(--fg)] mb-1">
                            Enter the code on your device
                        </h1>
                        <p className="text-sm text-[var(--fg-muted)] mb-6">
                            Look for a code shown in your terminal or on your
                            device&apos;s screen.
                        </p>
                        <form onSubmit={handleSubmitCode}>
                            <input
                                value={userCode}
                                onChange={(e) =>
                                    setUserCode(e.target.value.toUpperCase())
                                }
                                placeholder="XXXX-XXXX"
                                autoComplete="off"
                                autoCapitalize="characters"
                                spellCheck={false}
                                maxLength={12}
                                disabled={view.phase === "loading"}
                                className="w-full text-center text-2xl tracking-widest font-mono bg-[var(--field-bg)] border border-[var(--border)] rounded-lg py-4 text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                            />
                            <button
                                type="submit"
                                disabled={
                                    view.phase === "loading" ||
                                    userCode.trim().length === 0
                                }
                                className="mt-4 w-full rounded-lg bg-[var(--accent)] py-3 font-semibold text-[var(--accent-contrast)] disabled:opacity-50"
                            >
                                {view.phase === "loading"
                                    ? "Checking…"
                                    : "Continue"}
                            </button>
                        </form>
                    </>
                ) : null}

                {view.phase === "ready" ? (
                    <>
                        <p className="text-xs font-mono uppercase tracking-wide text-[var(--fg-faint)] mb-2">
                            Confirm access
                        </p>
                        <p className="text-sm text-[var(--fg)] mb-1">
                            <strong>
                                {view.details.client_name ||
                                    view.details.client_id}
                            </strong>{" "}
                            wants to access your account.
                        </p>
                        {view.details.expires_at ? (
                            <p className="text-xs font-mono text-[var(--fg-faint)] mb-5">
                                Expires{" "}
                                {new Date(
                                    view.details.expires_at,
                                ).toLocaleTimeString()}
                            </p>
                        ) : null}

                        <ul className="rounded-lg border border-[var(--border)] overflow-hidden mb-2">
                            {(view.details.scopes || []).map((scope) => {
                                const detail = (
                                    LIXBLOGS_SCOPE_DETAILS as Record<
                                        string,
                                        | {
                                              label: string;
                                              description: string;
                                              highImpact: boolean;
                                          }
                                        | undefined
                                    >
                                )[scope];
                                const highImpact = isHighImpactScope(scope);
                                return (
                                    <li
                                        key={scope}
                                        className={`flex items-start gap-2 px-4 py-3 text-sm border-t border-[var(--border)] first:border-t-0 ${
                                            highImpact
                                                ? "bg-[rgba(217,119,6,0.12)]"
                                                : ""
                                        }`}
                                    >
                                        <span
                                            className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-none ${
                                                highImpact
                                                    ? "bg-amber-500"
                                                    : "bg-[var(--fg-faint)]"
                                            }`}
                                        />
                                        <span className="text-[var(--fg)]">
                                            {detail?.label ||
                                                detail?.description ||
                                                scope}
                                            {highImpact ? (
                                                <span className="ml-2 rounded border border-amber-600/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-600">
                                                    High impact
                                                </span>
                                            ) : null}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mt-6 flex flex-col gap-3">
                            <button
                                onClick={() => resolve("approve")}
                                className="w-full rounded-lg bg-[var(--accent)] py-3 font-semibold text-[var(--accent-contrast)]"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => resolve("deny")}
                                className="w-full rounded-lg border border-[var(--border)] py-3 font-semibold text-red-500"
                            >
                                Deny
                            </button>
                        </div>
                    </>
                ) : null}

                {view.phase === "resolved" ? (
                    <div className="text-center">
                        <div className="text-4xl mb-3">
                            {view.outcome === "approved" ? "✓" : "×"}
                        </div>
                        <h1 className="text-xl font-semibold text-[var(--fg)] mb-1">
                            {view.outcome === "approved"
                                ? "You're all set"
                                : "Request denied"}
                        </h1>
                        <p className="text-sm text-[var(--fg-muted)]">
                            {view.outcome === "approved"
                                ? "Your device should sign in automatically within a few seconds. You can close this window."
                                : "The device won't be able to sign in."}
                        </p>
                    </div>
                ) : null}

                {view.phase === "error" ? (
                    <>
                        <p className="text-xs font-mono uppercase tracking-wide text-[var(--fg-faint)] mb-2">
                            Device sign-in
                        </p>
                        <h1 className="text-xl font-semibold text-[var(--fg)] mb-2">
                            Can&apos;t continue
                        </h1>
                        <p className="text-sm text-red-500 mb-6">
                            {view.message}
                        </p>
                        <button
                            onClick={() => setView({ phase: "entering" })}
                            className="w-full rounded-lg border border-[var(--border)] py-3 font-semibold text-[var(--fg)]"
                        >
                            Enter a new code
                        </button>
                    </>
                ) : null}
            </div>
        </main>
    );
}

export default function DeviceVerificationPage() {
    return (
        <Suspense>
            <DeviceVerificationContent />
        </Suspense>
    );
}
