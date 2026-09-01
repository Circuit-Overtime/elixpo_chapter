#!/usr/bin/env node

import { createLixSketchMcpServer } from './server.js';
import { FileSceneStore } from './fileStore.js';
import { MarketplaceTemplateProvider } from './templates.js';
import { serveLixSketchStdio } from './stdioTransport.js';

function parseArguments(argv) {
  const options = { scene: process.env.LIXSKETCH_SCENE_FILE || './lixsketch-mcp.lixjson', marketplaceUrl: process.env.LIXSKETCH_MARKETPLACE_URL || 'https://sketch.elixpo.com' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--scene') options.scene = argv[++index];
    else if (argument === '--marketplace-url') options.marketplaceUrl = argv[++index];
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.scene) throw new Error('--scene requires a file path');
  return options;
}

function printHelp() {
  process.stderr.write(`LixSketch MCP server\n\nUsage:\n  lixsketch-mcp --scene ./diagram.lixjson\n\nOptions:\n  --scene <path>             Atomic .lixjson scene file (default: ./lixsketch-mcp.lixjson)\n  --marketplace-url <url>    Template marketplace origin\n  -h, --help                 Show this help\n\nEnvironment:\n  LIXSKETCH_SCENE_FILE\n  LIXSKETCH_MARKETPLACE_URL\n`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) { printHelp(); return; }
  const store = new FileSceneStore(options.scene);
  const server = createLixSketchMcpServer({ store, templateProvider: new MarketplaceTemplateProvider({ baseUrl: options.marketplaceUrl }) });
  const transport = serveLixSketchStdio(server);
  const close = () => { void transport.close().finally(() => process.exit(0)); };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  process.stderr.write(`LixSketch MCP ready: ${store.filePath}\n`);
  await transport.closed;
}

main().catch((error) => {
  process.stderr.write(`LixSketch MCP failed: ${error?.message || error}\n`);
  process.exitCode = 1;
});
