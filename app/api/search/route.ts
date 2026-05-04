import { NextRequest, NextResponse } from "next/server";
import { searchDuckDuckGo } from "@/app/utils/search/duckduckgo";

async function readQuery(req: NextRequest) {
  if (req.method === "GET") {
    return (
      req.nextUrl.searchParams.get("query") ||
      req.nextUrl.searchParams.get("q") ||
      ""
    );
  }

  try {
    const body = (await req.json()) as { query?: string };
    return body?.query?.trim() || "";
  } catch {
    return "";
  }
}

async function handle(req: NextRequest) {
  const query = await readQuery(req);

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
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
