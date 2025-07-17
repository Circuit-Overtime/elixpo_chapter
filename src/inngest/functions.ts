import { inngest } from "./client";
import {  openai, createAgent,gemini } from "@inngest/agent-kit";
import { getSandbox } from "./utils";
import { Sandbox } from "@e2b/code-interpreter";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event,step }) => {
     const sandboxId = await step.run("get_sandbox-id",async () => {
          const sandbox = await Sandbox.create("fing-next-jsv1");
          return sandbox.sandboxId
    }); 
     // Create a new agent with a system prompt (you can add optional tools, too)
    const codeAgent = createAgent({ 
      name: "codeAgent",
      system: "You are CodeAgent and expert Next.js developer. You write readable, maintainable code. You write next.js and react code snippets",
      model: gemini({ model: "gemini-2.0-flash-lite" }),
    });
    const {output} = await codeAgent.run(
      `Sir here is your code: ${event.data.value}`
    )
    const sandboxUrl = await step.run("get-sandbox-url", async () => {
       const sandbox = await getSandbox(sandboxId);
       const host = sandbox.getHost(3000);
       return `https://${host}`
    })
  
    return { output,sandboxUrl };
  },
);