"use client";

import { Box } from "@mui/material";
import CodeBlock from "../../components/code-block";
import { Code, DocH2, DocLead, DocList, DocP, DocTitle } from "@/components/docs-prose";

const FILE = `{
  "app": {
    "homepage_url": "https://blogs.elixpo.com",
    "pricing_url":  "https://blogs.elixpo.com/pricing"
  },
  "products": [
    {
      "tier": "member",
      "name": "Blogs Member",
      "description": "Member-only reads, higher limits…",
      "prices": [
        { "nickname": "India",  "currency": "INR", "unit_amount": 19900, "interval": "month", "region": "IN" },
        { "nickname": "Global", "currency": "USD", "unit_amount":   600, "interval": "month" }
      ]
    }
  ]
}`;

const SYNC = `POST https://payouts.elixpo.com/v1/sync
Authorization: Bearer <ELIXPO_PAY_API_KEY>
Content-Type: application/json

<the contents of payouts.catalog.json>`;

const SCRIPT = `// scripts/sync-catalog.mjs
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile("payouts.catalog.json", "utf8"));
const res = await fetch("https://payouts.elixpo.com/v1/sync", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.ELIXPO_PAY_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ products: catalog.products }),
});
console.log(await res.json());`;

const READ = `GET https://payouts.elixpo.com/v1/catalog?app=<your-client-id>`;

export default function CatalogDocs() {
    return (
        <Box>
            <DocTitle>Catalog sync</DocTitle>
            <DocLead>
                Products and pricing tiers are managed from your code, not the
                dashboard. You keep a catalog file in your repo and push it with your
                secret key — so pricing is versioned, reviewable, and the same across
                environments. The dashboard shows the result read-only.
            </DocLead>

            <DocH2>1. Declare your catalog</DocH2>
            <DocP>
                Commit a <Code>payouts.catalog.json</Code> describing each product
                (by <Code>tier</Code>) and its regional prices. <Code>unit_amount</Code>{" "}
                is in minor units (paise/cents). The optional <Code>app</Code> block
                sets your homepage and pricing links (shown on your product page).
            </DocP>
            <CodeBlock code={FILE} language="json" />

            <DocH2>2. Push it with your secret key</DocH2>
            <CodeBlock code={SYNC} language="http" />
            <DocP>
                A tiny script makes it a one-liner you can run in CI or by hand:
            </DocP>
            <CodeBlock code={SCRIPT} language="javascript" />

            <DocH2>How sync reconciles</DocH2>
            <DocList
                items={[
                    <>Each product upserts by <Code>(app, tier)</Code> — same tier updates in place.</>,
                    <>Prices reconcile by <Code>(currency, region, interval)</Code> — matching prices update, new ones are added.</>,
                    <>An active price that's no longer in the file is <strong>deactivated</strong> (never hard-deleted, so history stays intact).</>,
                    <>Send a single product as the bare object, or many under <Code>products</Code>.</>,
                ]}
            />

            <DocH2>Read it back</DocH2>
            <DocP>
                Render your pricing page from the live catalog — public, no secret
                needed:
            </DocP>
            <CodeBlock code={READ} language="http" />
        </Box>
    );
}
