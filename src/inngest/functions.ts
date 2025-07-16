import { inngest } from "./client";
import {  openai, createAgent } from "@inngest/agent-kit";
export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event }) => {
   
     // Create a new agent with a system prompt (you can add optional tools, too)
    const codeAgent = createAgent({
      name: "codeAgent",
      system: "You are CodeAgent. Write clean, simple, and readable code. Be concise. Avoid unnecessary abstractions. Default to JavaScript, TypeScript, or Python. Add brief inline comments only if needed. Follow best practices.",
      model: openai({ model: "gpt-4o" }),
    });
    const {output} = await codeAgent.run(
      `Sir here is your code: ${event.data.value}`
    )

    return { output };
  },
);