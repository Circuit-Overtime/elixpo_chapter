const ANSI = Object.freeze({
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  violet: "\u001b[38;5;141m",
  green: "\u001b[38;5;42m",
});

export function colorEnabled(stream = process.stdout, env = process.env) {
  return Boolean(stream.isTTY) && env.NO_COLOR === undefined && env.TERM !== "dumb";
}

function paint(value, code, enabled) {
  return enabled ? `${code}${value}${ANSI.reset}` : value;
}

export function loginChallenge({ url, code, expiresInSeconds, profile, interactive, color = false }) {
  const title = `${paint("◆", ANSI.violet, color)} ${paint("LixBlogs", ANSI.bold, color)}`;
  const instruction = interactive
    ? "Press Enter to open here, or use the URL on another device."
    : "Open the URL in any browser and approve this device.";
  return [
    "",
    `  ${title}`,
    `  ${paint("Device login", ANSI.dim, color)}`,
    "  ─────────────────────────────────────────",
    `  URL      ${url}`,
    `  Code     ${paint(code, ANSI.bold, color)}`,
    `  Expires  ${Math.ceil(expiresInSeconds / 60)} min`,
    `  Profile  ${profile} ${paint("(local credential slot)", ANSI.dim, color)}`,
    "",
    `  ${instruction}`,
    "  No localhost callback or exposed port is required.",
    "",
  ].join("\n");
}

export function successLine(message, color = false) {
  return `  ${paint("✓", ANSI.green, color)} ${message}`;
}

export function listenForEnter({ input = process.stdin, open, url }) {
  if (!input.isTTY || typeof open !== "function") return () => {};
  const onData = () => { Promise.resolve(open(url)).catch(() => {}); };
  input.setEncoding?.("utf8");
  input.once("data", onData);
  input.resume?.();
  return () => {
    input.off?.("data", onData);
    input.pause?.();
  };
}
