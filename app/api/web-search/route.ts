import { NextRequest, NextResponse } from "next/server";
import { searchDuckDuckGo } from "@/app/utils/search/duckduckgo";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || searchParams.get("query") || "";

  if (!query) {
    return NextResponse.json(
      { query: "", results: [], message: "Missing query." },
      { status: 400 },
    );
  }

  const { results, message } = await searchDuckDuckGo(query);

  return NextResponse.json({
    query,
    results,
    message,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { query?: string };
  const query = body?.query?.trim() || "";

  if (!query) {
    return NextResponse.json(
      { query: "", results: [], message: "Missing query." },
      { status: 400 },
    );
  }

  const { results, message } = await searchDuckDuckGo(query);

  return NextResponse.json({
    query,
    results,
    message,
  });
}
