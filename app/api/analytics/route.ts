import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const ALLOWED = new Set([
  "page_view",
  "tab_click",
  "profile_click",
  "homepage_click",
  "hashtag_click",
  "banner_click",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      event_type?: string;
      target_name?: string;
      visitor_id?: string;
    };

    const eventType = String(body.event_type ?? "").trim();
    if (!ALLOWED.has(eventType)) {
      return NextResponse.json(
        { ok: false, error: "invalid event" },
        { status: 400 },
      );
    }

    const targetName = String(body.target_name ?? "").trim();
    const visitorId = String(body.visitor_id ?? "").trim().slice(0, 80);
    const payload: {
      event_type: string;
      target_name?: string;
      visitor_id?: string;
    } = {
      event_type: eventType,
    };
    if (targetName) payload.target_name = targetName;
    if (visitorId) payload.visitor_id = visitorId;

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("analytics_events").insert(payload);
    if (error) {
      // visitor_id 컬럼 미적용 DB 호환: 컬럼 없이 재시도
      if (visitorId && /visitor_id/i.test(error.message)) {
        const { visitor_id: _omit, ...fallback } = payload;
        void _omit;
        const retry = await supabase.from("analytics_events").insert(fallback);
        if (retry.error) {
          console.warn("[analytics api]", retry.error.message);
          return NextResponse.json(
            { ok: false, error: retry.error.message },
            { status: 500 },
          );
        }
        return NextResponse.json({ ok: true });
      }
      console.warn("[analytics api]", error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
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
