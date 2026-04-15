/**
 * AgentRunner — simple agentic loop
 *
 * Given a user prompt the agent calls the LLM, detects tool-call markers in
 * the response, executes the matching tool, appends the result and calls
 * the LLM again.  The loop runs up to MAX_STEPS times.
 *
 * Tool-call format the LLM should emit:
 *   <tool_call>{"name":"webSearch","args":{"q":"..."}}</tool_call>
 *
 * Built-in tools
 *  - webSearch  : POST /api/web-search
 *  - webScrape  : POST /api/web-scraper   (reads a URL)
 *  - calculate  : eval a JS math expression safely
 *  - datetime   : current date/time
 */

export type AgentTool = {
  name: string;
  description: string;
  parameters: Record<string, string>;
};

export type AgentToolResult = {
  tool: string;
  args: Record<string, any>;
  result: string;
  error?: boolean;
};

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "webSearch",
    description: "Search the internet for current information",
    parameters: { q: "search query string" },
  },
  {
    name: "webScrape",
    description: "Read the content of a web page by URL",
    parameters: { url: "full URL to fetch" },
  },
  {
    name: "calculate",
    description:
      "Evaluate a safe mathematical expression (numbers, +−×÷ ^, Math.* functions)",
    parameters: { expr: "mathematical expression as a string" },
  },
  {
    name: "datetime",
    description: "Get the current date and time",
    parameters: {},
  },
];

export const AGENT_SYSTEM_PROMPT = `You are a helpful AI agent with access to tools. When you need to use a tool, emit it in this exact format on its own line:
<tool_call>{"name":"TOOL_NAME","args":{...}}</tool_call>

Available tools:
${AGENT_TOOLS.map(
  (t) =>
    `- ${t.name}: ${t.description}\n  params: ${JSON.stringify(t.parameters)}`,
).join("\n")}

After a tool result is provided to you (in a <tool_result> block), continue your response naturally. Only call one tool at a time. When you have enough information, give a final answer without any tool calls.`;

const TOOL_CALL_REGEX = /<tool_call>([\s\S]*?)<\/tool_call>/;

export async function executeTool(
  name: string,
  args: Record<string, any>,
): Promise<string> {
  try {
    switch (name) {
      case "webSearch": {
        const res = await fetch(
          `/api/web-search?q=${encodeURIComponent(args.q || "")}`,
        );
        if (!res.ok) throw new Error(`webSearch failed: ${res.status}`);
        const data = await res.json();
        // Return top 3 results as text
        const results = (data.results || []).slice(0, 3);
        if (results.length === 0) return "No results found.";
        return results
          .map((r: any) => `**${r.title}**\n${r.url}\n${r.snippet || ""}`)
          .join("\n\n---\n\n");
      }

      case "webScrape": {
        const res = await fetch(
          `/api/web-scraper?url=${encodeURIComponent(args.url || "")}`,
        );
        if (!res.ok) throw new Error(`webScrape failed: ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return (
          `**${data.title || args.url}**\n\n` +
          (data.content || "").slice(0, 3000)
        );
      }

      case "calculate": {
        // Safe eval — only numbers and Math functions
        const expr = (args.expr || "").replace(
          /[^0-9+\-*/().^%\sMath.,a-z]/gi,
          "",
        );

        const result = new Function(`"use strict"; return (${expr})`)();
        return String(result);
      }

      case "datetime": {
        return new Date().toLocaleString("id-ID", {
          dateStyle: "full",
          timeStyle: "long",
        });
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
}

/**
 * Parse tool_call tags from LLM output.
 * Returns null if no tool call found.
 */
export function parseToolCall(
  text: string,
): { name: string; args: Record<string, any> } | null {
  const match = TOOL_CALL_REGEX.exec(text);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

/** Strip tool_call XML from text before showing to user */
export function stripToolCalls(text: string): string {
  return text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
}

/** Max agentic iterations */
export const AGENT_MAX_STEPS = 6;
