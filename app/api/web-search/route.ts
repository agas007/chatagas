import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json(
      { error: "Missing query parameter 'q'" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!res.ok) {
      throw new Error("Target search engine returned an error");
    }

    const html = await res.text();
    const results = [];

    // Parse duckduckgo html results structure
    const resultRegex =
      /<a class="result__url" href="([^"]+)".*?>(.*?)<\/a>.*?<a class="result__snippet[^>]*>(.*?)<\/a>/gs;

    let match;
    let count = 0;
    while ((match = resultRegex.exec(html)) !== null && count < 5) {
      const url = match[1];
      let snippet = match[3]
        // remove bold tags
        .replace(/<b>/g, "")
        .replace(/<\/b>/g, "")
        // remove any remaining HTML tags
        .replace(/<[^>]*>?/gm, " ")
        .replace(/&nbsp;/g, " ")
        .trim();

      results.push({ url, snippet });
      count++;
    }

    // fallback regex if structural changes happen
    if (results.length === 0) {
      const snippetRegex = /<a class="result__snippet[^>]*>(.*?)<\/a>/gs;
      while ((match = snippetRegex.exec(html)) !== null && count < 5) {
        let snippet = match[1].replace(/<[^>]*>?/gm, " ").trim();
        results.push({ snippet });
        count++;
      }
    }

    return NextResponse.json({
      query: q,
      results,
    });
  } catch (error: any) {
    console.error("Web Search Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
