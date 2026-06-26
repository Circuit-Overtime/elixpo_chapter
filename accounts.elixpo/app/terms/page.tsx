import { Box, Stack, Typography } from "@mui/material";
import type { Metadata } from "next";
import BackgroundAurora from "../components/background-aurora";
import Navbar from "../components/navbar";

export const metadata: Metadata = {
    title: "Terms of Service — Elixpo Accounts",
    description:
        "The terms governing your use of Elixpo Accounts and the Elixpo product suite.",
};

/**
 * /terms — Terms of Service.
 *
 * Scaffolded as a starting point for an SSO + OAuth provider. Have a
 * lawyer review and adapt for your jurisdiction before launch. The
 * Liability + Indemnity + Governing Law sections in particular have
 * placeholder values you should set explicitly.
 */
export default function TermsPage() {
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
                    color: "var(--fg)",
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
                        Terms of Service
                    </Typography>
                    <Typography
                        sx={{
                            color: "var(--fg-faint)",
                            fontSize: "0.95rem",
                            mb: 4,
                        }}
                    >
                        Effective: 22 June 2026 · Last updated: 22 June 2026
                    </Typography>

                    <Stack spacing={3.5}>
                        <Section title="1. Agreement to terms">
                            By creating an Elixpo Accounts account or using any
                            Elixpo product that authenticates via Elixpo
                            Accounts, you agree to these Terms. If you don't
                            agree, don't use the service.
                        </Section>

                        <Section title="2. What we provide">
                            Elixpo Accounts is a single sign-on and OAuth 2.0
                            identity provider. You can sign in with your Elixpo
                            Accounts identity to first-party Elixpo products and
                            to third-party applications that integrate with us.
                        </Section>

                        <Section title="3. Your account">
                            <ul>
                                <li>
                                    You must be at least 13 years old to use
                                    Elixpo Accounts.
                                </li>
                                <li>
                                    You are responsible for keeping your
                                    credentials, second factors, and backup
                                    codes confidential.
                                </li>
                                <li>
                                    You agree to provide accurate information
                                    and update it when it changes.
                                </li>
                                <li>
                                    We may suspend or terminate accounts that
                                    violate these Terms, are used for fraud or
                                    abuse, or are inactive for an extended
                                    period (we'll notify you first when
                                    possible).
                                </li>
                            </ul>
                        </Section>

                        <Section title="4. Multi-factor authentication">
                            We require two-factor authentication for accounts
                            that own three or more OAuth apps. You are
                            responsible for keeping a working second factor on
                            file and your backup codes in a safe place. Lost
                            access to all factors may require manual recovery
                            and reasonable proof of identity.
                        </Section>

                        <Section title="5. OAuth apps you register">
                            If you register an OAuth application:
                            <ul>
                                <li>
                                    You must accurately represent your app to
                                    end users on the consent screen.
                                </li>
                                <li>
                                    You must comply with our scope contract —
                                    use the user data we share only for the
                                    purposes you disclosed.
                                </li>
                                <li>
                                    Webhook endpoints must be HTTPS (except
                                    localhost in development) and you must
                                    verify our signature on every request.
                                </li>
                                <li>
                                    You may not impersonate Elixpo or any other
                                    entity.
                                </li>
                            </ul>
                        </Section>

                        <Section title="6. Paid tiers">
                            Indie and Studio tiers are billed monthly in INR via
                            Razorpay through Elixpo Pay. By subscribing to a
                            paid tier you authorize us to charge your chosen
                            payment method on each renewal date until you
                            cancel. We'll email a receipt for each charge and a
                            notice if a charge fails. Test pricing may be in
                            effect at launch; the real recurring prices are
                            listed on{" "}
                            <a href="/pricing" style={{ color: "#ff7759" }}>
                                /pricing
                            </a>
                            .
                        </Section>

                        <Section title="7. Refunds">
                            Subscriptions are non-refundable for the current
                            period. If you cancel, you keep access until the end
                            of the period you've paid for, and we won't charge
                            you again. Contact{" "}
                            <a
                                href="mailto:support@elixpo.com"
                                style={{ color: "#ff7759" }}
                            >
                                support@elixpo.com
                            </a>{" "}
                            within 7 days of any disputed charge.
                        </Section>

                        <Section title="8. Acceptable use">
                            You agree not to:
                            <ul>
                                <li>
                                    Probe, scan, or test the service for
                                    vulnerabilities without our prior written
                                    consent.
                                </li>
                                <li>
                                    Use the service to send spam, phishing, or
                                    any unlawful content.
                                </li>
                                <li>
                                    Attempt to bypass rate limits, quotas, or
                                    abuse prevention measures.
                                </li>
                                <li>
                                    Reverse-engineer or attempt to extract other
                                    users' personal data.
                                </li>
                            </ul>
                        </Section>

                        <Section title="9. Intellectual property">
                            The Elixpo brand, logos, and product code are our
                            property. Code that we open-source is licensed under
                            its stated license (typically MIT). Site assets are
                            licensed CC-BY-4.0 except for the Elixpo wordmark
                            and trademarks, which are reserved.
                        </Section>

                        <Section title="10. Disclaimer of warranties">
                            The service is provided on an "as is" and "as
                            available" basis. To the maximum extent permitted by
                            law, we disclaim all warranties, express or implied,
                            including merchantability, fitness for a particular
                            purpose, and non-infringement.
                        </Section>

                        <Section title="11. Limitation of liability">
                            To the maximum extent permitted by law, our total
                            liability to you for any claim arising from or
                            related to the service will not exceed the amount
                            you paid us in the 12 months preceding the claim, or
                            ₹1,000, whichever is greater.
                        </Section>

                        <Section title="12. Governing law">
                            These Terms are governed by the laws of India,
                            without regard to conflict-of-laws principles.
                            Disputes will be resolved exclusively in the courts
                            located in the Republic of India.
                        </Section>

                        <Section title="13. Changes">
                            We may update these Terms from time to time. For
                            material changes we'll notify you via email or an
                            in-app banner at least 14 days before they take
                            effect. Continued use of the service after the
                            change constitutes acceptance.
                        </Section>

                        <Section title="14. Contact">
                            <a
                                href="mailto:support@elixpo.com"
                                style={{ color: "#ff7759" }}
                            >
                                support@elixpo.com
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
                    color: "var(--fg)",
                }}
            >
                {title}
            </Typography>
            <Box
                sx={{
                    color: "var(--fg-muted)",
                    fontSize: "0.96rem",
                    lineHeight: 1.7,
                    "& ul": { pl: 3, m: 0, mt: 1 },
                    "& li": { mb: 0.6 },
                    "& strong": { color: "var(--fg)", fontWeight: 600 },
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
