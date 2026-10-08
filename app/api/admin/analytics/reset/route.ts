import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE, ADMIN_AUTH_VALUE } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 오픈용 사용 데이터 초기화.
 * analytics_events 만 삭제 — brand_info / 랭킹 CSV / hashtag_metadata 등은 절대 건드리지 않음.
 */
export async function POST() {
  try {
    const jar = await cookies();
    if (jar.get(ADMIN_AUTH_COOKIE)?.value !== ADMIN_AUTH_VALUE) {
      return NextResponse.json(
        { ok: false, error: "관리자 로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const supabase = getSupabaseAdminClient();

    // id IS NOT NULL 조건으로 analytics_events 전체 삭제 (다른 테이블 미접근)
    const { error, count } = await supabase
      .from("analytics_events")
      .delete({ count: "exact" })
      .not("id", "is", null);

    if (error) {
      console.warn("[analytics reset]", error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: `사용 데이터(analytics_events) ${count ?? 0}건이 초기화되었습니다. 랭킹·브랜드 데이터는 유지됩니다.`,
      deleted: count ?? 0,
    });
  } catch (error) {
    console.warn("[analytics reset]", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "사용 데이터 초기화에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
