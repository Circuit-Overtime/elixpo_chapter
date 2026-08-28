"use client";

import {
    isHighImpactScope,
    LIXBLOGS_SCOPE_DETAILS,
} from "@/lib/lixblogs-scopes";
import { OAUTH_SCOPE_DETAILS } from "@/lib/oauth-scopes";
import { generatePixelAvatar } from "@/lib/pixel-avatar";

export type ConsentAccount = {
    id: string;
    email: string;
    displayName: string | null;
    avatar?: string | null;
};

export function AccountSelector({
    account,
    accounts,
    disabled,
    onSwitch,
    addHref,
}: {
    account: ConsentAccount;
    accounts: ConsentAccount[];
    disabled: boolean;
    onSwitch: (userId: string) => void;
    addHref: string;
}) {
    return (
        <div style={{ padding: "0 16px 14px", textAlign: "center" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                }}
            >
                <img
                    src={
                        account.avatar || generatePixelAvatar(account.email, 32)
                    }
                    alt=""
                    width={32}
                    height={32}
                    style={{ borderRadius: "50%", flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                    <strong
                        style={{
                            display: "block",
                            color: "var(--fg)",
                            fontSize: 12.5,
                        }}
                    >
                        {account.displayName || account.email}
                    </strong>
                    <span
                        style={{
                            display: "block",
                            color: "var(--fg-faint)",
                            fontSize: 11.5,
                            overflowWrap: "anywhere",
                        }}
                    >
                        {account.email}
                    </span>
                </div>
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 10,
                }}
            >
                {accounts.length > 1 && (
                    <select
                        aria-label="Choose an account"
                        value={account.id}
                        disabled={disabled}
                        onChange={(event) => onSwitch(event.target.value)}
                        style={{
                            maxWidth: "100%",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            background: "var(--surface)",
                            color: "var(--fg-muted)",
                            fontSize: 12,
                            padding: "7px 9px",
                        }}
                    >
                        {accounts.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                                {candidate.displayName || candidate.email}
                            </option>
                        ))}
                    </select>
                )}
                <a
                    href={addHref}
                    style={{
                        color: "#ff7759",
                        fontSize: 12,
                        fontWeight: 650,
                        textDecoration: "none",
                    }}
                >
                    Add account
                </a>
            </div>
        </div>
    );
}

export function OAuthScopeList({
    scopes,
    accentColor = "#ff7759",
}: {
    scopes: string[];
    accentColor?: string;
}) {
    return (
        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 16,
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scopes.map((scope) => {
                    const core =
                        OAUTH_SCOPE_DETAILS[
                            scope as keyof typeof OAUTH_SCOPE_DETAILS
                        ];
                    const resource = (
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
                    const detail = core ||
                        resource || {
                            label: scope,
                            description: "Use this permission as registered.",
                        };
                    const highImpact = isHighImpactScope(scope);
                    return (
                        <div
                            key={scope}
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                padding: highImpact ? 8 : 0,
                                borderRadius: 8,
                                background: highImpact
                                    ? "rgba(217,119,6,0.1)"
                                    : "transparent",
                            }}
                        >
                            <span
                                aria-hidden="true"
                                style={{
                                    color: highImpact ? "#d97706" : accentColor,
                                    fontWeight: 800,
                                }}
                            >
                                ✓
                            </span>
                            <span>
                                <strong
                                    style={{
                                        display: "block",
                                        color: "var(--fg)",
                                        fontSize: 13,
                                    }}
                                >
                                    {detail.label}
                                    {highImpact ? " · High impact" : ""}
                                </strong>
                                <span
                                    style={{
                                        color: "var(--fg-muted)",
                                        fontSize: 12,
                                        lineHeight: 1.45,
                                    }}
                                >
                                    {detail.description}
                                </span>
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
