"use client";

import {
    BaseUrlChip,
    Code,
    DocH2,
    DocLead,
    DocList,
    DocP,
    DocTitle,
} from "@/components/docs-prose";
import { Box } from "@mui/material";

export default function DocsOverview() {
    return (
        <Box>
            <DocTitle>Elixpo Pay — Overview</DocTitle>
            <DocLead>
                Elixpo Pay is the payments and payouts layer for the Elixpo
                ecosystem, and an open SaaS for any developer. It abstracts
                providers behind one API plus a hosted checkout, a unified
                ledger, entitlement grants, and creator payouts.
            </DocLead>
            <BaseUrlChip />

            <DocH2>How it fits together</DocH2>
            <DocP>
                Your app never touches card data. Your server creates a checkout
                session with your secret key and redirects the buyer to our
                hosted checkout; we charge them through a provider (Razorpay for
                INR in P0), then grant an entitlement and tell your app about it
                two ways:
            </DocP>
            <DocList
                items={[
                    <>
                        a signed <Code>entitlement.updated</Code> webhook
                        delivered to your app, and
                    </>,
                    <>
                        a pull endpoint,{" "}
                        <Code>GET /v1/entitlements?app=&uid=</Code>, you can
                        call any time.
                    </>,
                ]}
            />

            <DocH2>Core concepts</DocH2>
            <DocList
                items={[
                    <>
                        <strong>Merchant</strong> — your tenant. You sign in
                        with Elixpo Accounts.
                    </>,
                    <>
                        <strong>App</strong> — a project under your merchant
                        (e.g. <Code>lixblogs</Code>), with its own API key.
                    </>,
                    <>
                        <strong>Product</strong> — a sellable tier (e.g.{" "}
                        <Code>member</Code>).
                    </>,
                    <>
                        <strong>Price</strong> — a regional/PPP variant of a
                        product in a currency.
                    </>,
                    <>
                        <strong>Entitlement</strong> — the tier + expiry a
                        customer currently holds.
                    </>,
                ]}
            />

            <DocH2>P0 scope</DocH2>
            <DocP>
                The first release powers first-party billing for blogs.elixpo
                with Razorpay (INR), one-time orders that grant a 30-day
                entitlement. Stripe, true recurring subscriptions, creator
                payouts, and bring-your-own-keys multi-tenancy follow.
            </DocP>
        </Box>
    );
}
