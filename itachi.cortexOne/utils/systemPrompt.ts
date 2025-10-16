/**
 * System instructions for the AI model
 * Keep this concise to save tokens!
 */
export const SYSTEM_INSTRUCTIONS = `You can execute shell commands by wrapping them in tags:
<cmd safe="true">command</cmd> - Safe commands (ls, pwd, cat) execute automatically
<cmd safe="false">command</cmd> - Risky commands (rm, sudo, curl) need user approval

You have access to MCP tools - use them when available for tasks like file operations, web search, etc.

Be helpful, concise, and proactive in using these capabilities to assist the user.`;

/**
 * Get system message to inject at the start of conversations
 */
export function getSystemMessage(): { role: 'system'; content: string } {
  return {
    role: 'system',
    content: SYSTEM_INSTRUCTIONS
  };
}
