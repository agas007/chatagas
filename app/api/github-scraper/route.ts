import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repoUrl = searchParams.get("url");

  if (!repoUrl) {
    return NextResponse.json(
      { error: "GitHub URL is required" },
      { status: 400 },
    );
  }

  try {
    // Basic parse: https://github.com/owner/repo
    const regex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = repoUrl.match(regex);

    if (!match) {
      throw new Error(
        "Invalid GitHub URL format. Use https://github.com/owner/repo",
      );
    }

    const owner = match[1];
    const repo = match[2].replace(".git", "");

    // Fetch repo info and latest commit for tree sha
    const repoRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches/main`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
      },
    );

    let branch = "main";
    if (!repoRes.ok) {
      // try master if main fails
      const masterRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/branches/master`,
      );
      if (masterRes.ok) branch = "master";
      else throw new Error("Could not find main or master branch");
    }

    // Get recursive tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    );
    const treeData = await treeRes.json();

    if (!treeData.tree) throw new Error("Failed to fetch repository tree");

    // Filter interesting files (code, docs, config) - limit to 30 files to avoid context blowout
    const ignoredExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".pdf",
      ".zip",
      ".exe",
      ".dll",
    ];
    const files = treeData.tree
      .filter((f: any) => f.type === "blob")
      .filter(
        (f: any) =>
          !ignoredExtensions.some((ext) => f.path.toLowerCase().endsWith(ext)),
      )
      .slice(0, 30); // Grab top 30 files

    let combinedContent = `# GitHub Repository: ${owner}/${repo}\n\n`;

    for (const file of files) {
      const contentRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
      );
      if (contentRes.ok) {
        const text = await contentRes.text();
        combinedContent += `### File: ${file.path}\n\n` + text + "\n\n---\n\n";
      }
    }

    return NextResponse.json({
      title: `GitHub: ${owner}/${repo}`,
      content: combinedContent,
      owner,
      repo,
    });
  } catch (error: any) {
    console.error("GitHub Scraper Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
