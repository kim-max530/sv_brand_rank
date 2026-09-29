import { NextResponse } from "next/server";
import { incrementAuthorClicks } from "@/lib/author-stats";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { uid?: string };
    const uid = String(body.uid ?? "").trim();
    if (!uid) {
      return NextResponse.json({ ok: false, error: "uid required" }, { status: 400 });
    }

    const totalClicks = await incrementAuthorClicks(uid);
    if (totalClicks == null) {
      return NextResponse.json(
        { ok: false, error: "increment failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, total_clicks: totalClicks });
  } catch (error) {
    console.warn("[author-stats api]", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "author stats update failed",
      },
      { status: 500 },
    );
  }
}
