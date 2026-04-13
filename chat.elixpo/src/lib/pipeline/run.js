#!/usr/bin/env node
/**
 * Single entrypoint for the Elixpo content generation pipeline.
 * Runs news and podcast generation sequentially with full state management.
 *
 * Usage:
 *   node src/lib/pipeline/run.js              # Run both news + podcast
 *   node src/lib/pipeline/run.js --news       # Run news only
 *   node src/lib/pipeline/run.js --podcast    # Run podcast only
 */

import fs from "fs";
import path from "path";
import { runNewsPipeline } from "./news/index.js";
import { runPodcastPipeline } from "./podcast/index.js";

const STATE_FILE = path.resolve("tmp/pipeline_state.json");

function ensureTmp() {
  const dir = path.resolve("tmp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { news: "pending", podcast: "pending" };
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
}

function saveState(state) {
  ensureTmp();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

async function main() {
  const args = process.argv.slice(2);
  const runNews = args.length === 0 || args.includes("--news");
  const runPodcast = args.length === 0 || args.includes("--podcast");

  // Step targeting: --step=upload, --step=thumbnail, etc.
  const stepArg = args.find((a) => a.startsWith("--step="));
  const step = stepArg ? stepArg.split("=")[1] : "all";

  ensureTmp();
  const state = loadState();

  console.log("═══════════════════════════════════════");
  console.log("  Elixpo Content Pipeline");
  console.log(`  ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════\n");

  // Note: In production, `db` comes from Cloudflare D1 binding.
  // For local testing without D1, we create a mock that logs operations.
  const db = createDbProxy();

  // === NEWS ===
  if (runNews && state.news !== "complete") {
    console.log("━━━ NEWS PIPELINE ━━━\n");
    state.news = "running";
    saveState(state);
    try {
      await runNewsPipeline(db);
      state.news = "complete";
      state.news_completed_at = new Date().toISOString();
      saveState(state);
      console.log("\n✅ News pipeline finished.\n");
    } catch (err) {
      state.news = "failed";
      state.news_error = err.message;
      saveState(state);
      console.error(`\n❌ News pipeline failed: ${err.message}\n`);
      console.log("Re-run this script to resume from the last checkpoint.\n");
    }
  } else if (runNews) {
    console.log("✅ News already complete for this run. Skipping.\n");
  }

  // === PODCAST ===
  if (runPodcast && state.podcast !== "complete") {
    console.log("━━━ PODCAST PIPELINE ━━━\n");
    state.podcast = "running";
    saveState(state);
    try {
      await runPodcastPipeline(db, { step });
      state.podcast = "complete";
      state.podcast_completed_at = new Date().toISOString();
      saveState(state);
      console.log("\n✅ Podcast pipeline finished.\n");
    } catch (err) {
      state.podcast = "failed";
      state.podcast_error = err.message;
      saveState(state);
      console.error(`\n❌ Podcast pipeline failed: ${err.message}\n`);
      console.log("Re-run this script to resume from the last checkpoint.\n");
    }
  } else if (runPodcast) {
    console.log("✅ Podcast already complete for this run. Skipping.\n");
  }

  // Clean up state file if both are complete
  if (state.news === "complete" && state.podcast === "complete") {
    fs.unlinkSync(STATE_FILE);
    console.log("═══════════════════════════════════════");
    console.log("  All pipelines complete! State cleaned.");
    console.log("═══════════════════════════════════════");
  }
}

/**
 * Creates a D1-compatible proxy for local testing.
 * In production, pass the real D1 binding from Cloudflare.
 */
function createDbProxy() {
  return {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async run() {
              console.log(`  [D1] ${sql}`);
              console.log(`       params: ${JSON.stringify(params).slice(0, 200)}`);
              return { success: true };
            },
            async first() {
              console.log(`  [D1 QUERY] ${sql}`);
              console.log(`       params: ${JSON.stringify(params)}`);
              return null; // No data in local mock
            },
          };
        },
      };
    },
  };
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
