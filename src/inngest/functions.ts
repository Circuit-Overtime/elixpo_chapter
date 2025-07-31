import { inngest } from "./client";
import { openai, createAgent, gemini, createTool, createNetwork, type Tool } from "@inngest/agent-kit";
import { getSandbox, lastAssisTextMsgCon } from "./utils";
import { Sandbox } from "@e2b/code-interpreter";

import { PROMPT } from "@/prompt";
/* import {zodToJsonSchema} from 'zod-to-json-schema' */
// --- Fix: Use Zod schemas for tool parameters to avoid zod-to-json-schema errors ---
// See: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling
import { z } from "zod";
import prisma from "@/lib/db";
import { anthropic } from "inngest";


// Use plain ZodObject types for parameters to avoid type errors
/* const terminalParameters = z.object({
  command: z.string().describe("The command to run in the terminal"),
});

const createOrUpdateFilesParameters = z.object({
  files: z.array(
    z.object({
      path: z.string().describe("File path"),
      content: z.string().describe("File content"),
    })
  ),
});

const readFilesParameters = z.object({
  files: z.array(z.string().describe("File path")),
}); */

interface AgentState {
   summary: string
   files: {[path:string]:string}
}

export const fing_AI_Agent = inngest.createFunction(
  { id: "code-agent" },
  { event: "app/message.created" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get_sandbox-id", async () => {
      const sandbox = await Sandbox.create("fing-next-jsv1");
      return sandbox.sandboxId;
    });

    // Create a new agent with a system prompt (you can add optional tools, too)
    const codeAgent = createAgent<AgentState>({
      name: "Fing-AI",
      description: "I'm FING AI, a expert coding agent. I can develope next.js project. Interactive UI",
      system: PROMPT,
      model: gemini({ model: "gemini-2.0-flash-lite"}),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal for run commands",
          parameters: z.object({
             command: z.string()
          }) as any,
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffer = { stdout: "", stderr: "" };
              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffer.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffer.stderr += data;
                  }
                });
                return result.stdout;
              } catch (error) {
                console.error(
                  `Command Failed: ${error} \n stdout: ${buffer.stdout} \n stderr: ${buffer.stderr}`
                );
                return `Command Failed: ${error} \n stdout: ${buffer.stdout} \n stderr: ${buffer.stderr}`;
              }
            });
          }
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create and update files in the sandbox",
          parameters: z.object({
             files: z.array(
                z.object({
                path: z.string().describe("File path"),
                content: z.string().describe("File content"),
             })),
          }) as any,
          handler: async ({ files }, { step, network }: Tool.Options<AgentState>) => {
            const newFiles = await step?.run("createOrUpdateFiles", async () => {
              try {
                const updatedFiles = network.state.data.files || {};
                const sandbox = await getSandbox(sandboxId);
                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }
                return updatedFiles;
              } catch (error) {
                return "Error: " + error;
              }
            });
            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          }
        }),
        createTool({
          name: "readFiles",
          description: "Read Files from the sandboxes",
          parameters: z.object({
            files: z.array(z.string()),
            }) as any,
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents);
              } catch (error) {
                return "Error: " + error;
              }
            });
          }
        })
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastMsgConAsis = lastAssisTextMsgCon(result);

          if (lastMsgConAsis && network) {
            if (lastMsgConAsis.includes("<task_summary>")) {
              network.state.data.summary = lastMsgConAsis;
            }
          }
          return result;
        }
      }
    });

    const network = createNetwork<AgentState>({
      name: "Fing-AI-networks",
      agents: [codeAgent],
      maxIter: 5,
      router: async ({ network }) => {
        const summary = network.state.data.summary;

        if (summary) {
          return;
        }
        return codeAgent;
      }
    });

    const result = await network.run(event.data.prompt);
    const isError = !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0
    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("save-result", async () => {
  const summary = result.state.data.summary ?? "No summary generated by the agent.";
 
   if(isError) {
     return await prisma.message.create({
       data: {
         projectId: event.data.projectId,
         content: summary,
         role: 'ASSISTANT',
         type: "RESULT"
       }
     })
   }
  return await prisma.message.create({
    data: {
      projectId: event.data.projectId,
      content: summary,
      role: "ASSISTANT",
      type: "RESULT",
      fragment: {
        create: {
          sandboxUrl: sandboxUrl,
          title: "Fragment",
          files: result.state.data.files,
        }
      },
    }
  });
});

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary
    };
  }
);