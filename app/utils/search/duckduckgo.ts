export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

type DuckDuckGoRelatedTopic = {
  Text?: string;
  FirstURL?: string;
  Topics?: DuckDuckGoRelatedTopic[];
};

type DuckDuckGoResponse = {
  Heading?: string;
  AbstractText?: string;
  AbstractURL?: string;
  RelatedTopics?: DuckDuckGoRelatedTopic[];
};

function flattenRelatedTopics(
  topics: DuckDuckGoRelatedTopic[] | undefined,
  results: SearchResult[],
) {
  if (!topics?.length) return;

  for (const topic of topics) {
    if (topic.Topics?.length) {
      flattenRelatedTopics(topic.Topics, results);
      continue;
    }

    const text = topic.Text?.trim();
    const url = topic.FirstURL?.trim();

    if (!text || !url) continue;

    const [title, ...snippetParts] = text.split(" - ");
    results.push({
      title: title?.trim() || text,
      url,
      snippet: snippetParts.join(" - ").trim() || text,
    });
  }
}

export async function searchDuckDuckGo(query: string) {
  const safeQuery = query.trim();
  if (!safeQuery) {
    return {
      results: [] as SearchResult[],
      message: "No search query was provided.",
    };
  }

  try {
    const url = new URL("https://api.duckduckgo.com/");
    url.searchParams.set("q", safeQuery);
    url.searchParams.set("format", "json");
    url.searchParams.set("no_html", "1");
    url.searchParams.set("skip_disambig", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return {
        results: [] as SearchResult[],
        message: "DuckDuckGo search is temporarily unavailable.",
      };
    }

    const data = (await res.json()) as DuckDuckGoResponse;
    const results: SearchResult[] = [];

    flattenRelatedTopics(data.RelatedTopics, results);

    if (results.length === 0 && data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading?.trim() || safeQuery,
        url: data.AbstractURL,
        snippet: data.AbstractText.trim(),
      });
    }

    const topResults = results.slice(0, 5);

    if (topResults.length === 0) {
      return {
        results: topResults,
        message: `No web results found for "${safeQuery}".`,
      };
    }

    return {
      results: topResults,
      message: "",
    };
  } catch (error) {
    console.error("[DuckDuckGo Search]", error);
    return {
      results: [] as SearchResult[],
      message: "DuckDuckGo search failed. Please try again later.",
    };
  }
}
