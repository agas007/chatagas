import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const syncData = await prisma.syncData.findFirst({
      where: { user: { email: session.user.email } },
    });

    return NextResponse.json({
      content: syncData?.content || "",
    });
  } catch (error) {
    console.error("Sync GET error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.syncData.upsert({
      where: { userId: user.id },
      update: { content },
      create: { content, userId: user.id },
    });

    return NextResponse.json({ message: "Synced successfully" });
  } catch (error) {
    console.error("Sync POST error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
