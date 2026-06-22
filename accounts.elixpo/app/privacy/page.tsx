import type { Metadata } from "next";
import { Box, Stack, Typography } from "@mui/material";
import BackgroundAurora from "../components/background-aurora";
import Navbar from "../components/navbar";

export const metadata: Metadata = {
    title: "Privacy Policy — Elixpo Accounts",
    description:
        "How Elixpo Accounts collects, uses, and protects your personal information.",
};

/**
 * /privacy — Privacy Policy.
 *
 * Scaffolded with the basics an SSO/OAuth provider needs. Replace the
 * placeholders (effective date, support email, jurisdiction) with the real
 * values, and have a lawyer review before formal launch.
 */
export default function PrivacyPage() {
    return (
        <>
            <BackgroundAurora variant="docs" />
            <Box sx={{ position: "relative", zIndex: 1 }}>
                <Navbar />
            </Box>
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    minHeight: "calc(100dvh - 68px)",
                    px: { xs: 2.5, sm: 4 },
                    py: { xs: 4, sm: 6 },
                    color: "#f5f5f4",
                }}
            >
                <Box sx={{ maxWidth: 760, mx: "auto" }}>
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: "2rem", sm: "2.4rem" },
                            letterSpacing: "-0.02em",
                            mb: 1,
                        }}
                    >
                        Privacy Policy
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(245,245,244,0.55)",
                            fontSize: "0.95rem",
                            mb: 4,
                        }}
                    >
                        Effective: 22 June 2026 · Last updated: 22 June 2026
                    </Typography>

                    <Stack spacing={3.5}>
                        <Section title="1. Who we are">
                            Elixpo Accounts (the "Service") is operated by
                            Elixpo. We provide single sign-on, OAuth identity,
                            and account management for the Elixpo product
                            suite and for third-party applications you grant
                            access to.
                        </Section>

                        <Section title="2. Information we collect">
                            <ul>
                                <li>
                                    <strong>Account information:</strong> email
                                    address, display name, profile photo, and
                                    optional username — provided by you or your
                                    social login provider (Google, GitHub,
                                    Discord, Microsoft).
                                </li>
                                <li>
                                    <strong>Authentication signals:</strong> a
                                    hash of your IP address and a short
                                    user-agent string for each session, kept to
                                    detect suspicious sign-ins. We do not store
                                    raw IP addresses.
                                </li>
                                <li>
                                    <strong>Multi-factor secrets:</strong> when
                                    you enroll TOTP, passkeys, or email OTP, we
                                    store the secrets in encrypted form on
                                    Cloudflare D1 and KV.
                                </li>
                                <li>
                                    <strong>OAuth app metadata:</strong> if you
                                    register an OAuth app, we store the app
                                    name, redirect URIs, webhook endpoints, and
                                    a hashed copy of the client secret.
                                </li>
                                <li>
                                    <strong>Billing data:</strong> if you
                                    subscribe to a paid tier, we store your
                                    tier and renewal date. Card details are
                                    handled exclusively by our payments
                                    partner (Razorpay via Elixpo Pay); we never
                                    see or store card numbers.
                                </li>
                            </ul>
                        </Section>

                        <Section title="3. How we use your information">
                            <ul>
                                <li>To authenticate you and your sessions.</li>
                                <li>
                                    To deliver service emails (verification,
                                    sign-in alerts, billing notifications) via
                                    our transactional mail provider (Elixpo
                                    Mails).
                                </li>
                                <li>
                                    To detect and prevent abuse, fraud, and
                                    account takeover.
                                </li>
                                <li>
                                    To honor your OAuth consents and forward
                                    only the profile attributes you approved
                                    to the third-party app.
                                </li>
                                <li>
                                    To process payments and provision
                                    entitlements through Elixpo Pay.
                                </li>
                            </ul>
                        </Section>

                        <Section title="4. Sharing">
                            We share your data only with:
                            <ul>
                                <li>
                                    OAuth applications you explicitly grant
                                    access — and only the attributes the app
                                    requested in its scopes.
                                </li>
                                <li>
                                    Service providers we depend on:
                                    Cloudflare (hosting, D1, KV), Razorpay
                                    (payments), and the identity providers
                                    you sign in with.
                                </li>
                                <li>
                                    Legal authorities, when compelled by a
                                    valid legal process applicable in our
                                    operating jurisdiction.
                                </li>
                            </ul>
                            We do not sell your personal data.
                        </Section>

                        <Section title="5. Data retention">
                            We keep account data for as long as your account
                            is active. When you delete your account, we
                            permanently delete or anonymize your records
                            within 30 days, except where retention is
                            required by law (e.g. invoices and audit logs,
                            which we keep for the period required by Indian
                            tax law).
                        </Section>

                        <Section title="6. Security">
                            We use industry-standard encryption (TLS in
                            transit, AES-GCM at rest for sensitive fields),
                            HMAC-signed webhooks, and hardware-backed JWT
                            signing keys. We support hardware passkeys, TOTP,
                            and email OTP as second factors; users with three
                            or more OAuth apps must enroll a second factor.
                        </Section>

                        <Section title="7. Your rights">
                            Depending on where you live, you may have rights
                            to access, correct, export, or delete your
                            personal data. Email{" "}
                            <a
                                href="mailto:privacy@elixpo.com"
                                style={{ color: "#9b7bf7" }}
                            >
                                privacy@elixpo.com
                            </a>{" "}
                            and we'll respond within 30 days.
                        </Section>

                        <Section title="8. Children">
                            Elixpo Accounts is not directed at children under
                            13. If you become aware that a child has provided
                            us with personal data, please contact us so we can
                            delete it.
                        </Section>

                        <Section title="9. Changes">
                            We may update this policy from time to time. If
                            we make material changes we'll notify you via
                            email or an in-app banner at least 14 days before
                            the change takes effect.
                        </Section>

                        <Section title="10. Contact">
                            Questions about this policy:{" "}
                            <a
                                href="mailto:privacy@elixpo.com"
                                style={{ color: "#9b7bf7" }}
                            >
                                privacy@elixpo.com
                            </a>
                            .
                        </Section>
                    </Stack>
                </Box>
            </Box>
        </>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <Box>
            <Typography
                sx={{
                    fontWeight: 700,
                    fontSize: "1.15rem",
                    mb: 1.2,
                    color: "#f5f5f4",
                }}
            >
                {title}
            </Typography>
            <Box
                sx={{
                    color: "rgba(245,245,244,0.75)",
                    fontSize: "0.96rem",
                    lineHeight: 1.7,
                    "& ul": { pl: 3, m: 0, mt: 1 },
                    "& li": { mb: 0.6 },
                    "& strong": { color: "#f5f5f4", fontWeight: 600 },
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
