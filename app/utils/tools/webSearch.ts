import type { SearchResult } from "../search/duckduckgo";

export const webSearchToolDefinition = {
  name: "web_search",
  description:
    "Search the web for current information, recent events, or anything that requires up-to-date data. Use this when the user asks about news, prices, weather, or anything time-sensitive.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query",
      },
    },
    required: ["query"],
  },
} as const;

export const webSearchTool = {
  type: "function",
  function: webSearchToolDefinition,
} as const;

function formatSearchResults(
  query: string,
  results: SearchResult[],
  message: string,
) {
  if (results.length === 0) {
    return message || `No web results found for "${query}".`;
  }

  const lines = [`Web search results for "${query}":`];
  results.forEach((result, index) => {
    lines.push(
      [`${index + 1}. ${result.title}`, result.url, result.snippet]
        .filter(Boolean)
        .join("\n"),
    );
  });

  if (message) {
    lines.push(message);
  }

  return lines.join("\n\n");
}

export async function runWebSearch(query: string) {
  const safeQuery = query.trim();
  if (!safeQuery) {
    return {
      data: "No search query was provided.",
      status: 200,
      statusText: "OK",
    };
  }

  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: safeQuery }),
    });

    const payload = (await res.json().catch(() => ({}))) as {
      results?: SearchResult[];
      message?: string;
    };

    return {
      data: formatSearchResults(
        safeQuery,
        Array.isArray(payload.results) ? payload.results.slice(0, 5) : [],
        payload.message || "",
      ),
      status: 200,
      statusText: "OK",
    };
  } catch (error) {
    console.error("[Web Search Tool]", error);
    return {
      data: "DuckDuckGo search failed. Please try again later.",
      status: 200,
      statusText: "OK",
    };
  }
}
