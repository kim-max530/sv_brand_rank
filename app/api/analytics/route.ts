import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const ALLOWED = new Set([
  "page_view",
  "tab_click",
  "profile_click",
  "homepage_click",
  "hashtag_click",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      event_type?: string;
      target_name?: string;
    };

    const eventType = String(body.event_type ?? "").trim();
    if (!ALLOWED.has(eventType)) {
      return NextResponse.json({ ok: false, error: "invalid event" }, { status: 400 });
    }

    const targetName = String(body.target_name ?? "").trim();
    const payload: { event_type: string; target_name?: string } = {
      event_type: eventType,
    };
    if (targetName) payload.target_name = targetName;

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("analytics_events").insert(payload);
    if (error) {
      console.warn("[analytics api]", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("[analytics api]", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "analytics insert failed",
      },
      { status: 500 },
    );
  }
}
