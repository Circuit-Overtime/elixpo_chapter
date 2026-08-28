import assert from "node:assert/strict";
import test from "node:test";
import { colorEnabled, loginChallenge } from "../src/cli/ui.js";

test("device login card remains useful without a TTY or colors", () => {
  const card = loginChallenge({
    url: "https://accounts.elixpo.com/device?user_code=ABCD-EFGH",
    code: "ABCD-EFGH",
    expiresInSeconds: 600,
    profile: "test",
    interactive: false,
  });
  assert.match(card, /Open the URL in any browser/);
  assert.match(card, /No localhost callback or exposed port is required/);
  assert.match(card, /test \(local credential slot\)/);
  assert.doesNotMatch(card, /\u001b\[/);
});

test("NO_COLOR disables terminal styling", () => {
  assert.equal(colorEnabled({ isTTY: true }, { NO_COLOR: "1", TERM: "xterm" }), false);
  assert.equal(colorEnabled({ isTTY: true }, { TERM: "xterm" }), true);
});
