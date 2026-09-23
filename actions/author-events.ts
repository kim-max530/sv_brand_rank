"use server";

import {
  listAuthorEvents,
  type AuthorEventRow,
} from "@/lib/author-events";
import { searchBrandAuthors } from "@/lib/csv";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type AuthorEventActionResult =
  | { ok: true; message: string; events?: AuthorEventRow[] }
  | { ok: false; error: string };

export type AuthorSearchResult =
  | { ok: true; authors: Array<{ UID: string; 저자명: string }> }
  | { ok: false; error: string };

export async function searchAuthorsByNameAction(
  name: string,
): Promise<AuthorSearchResult> {
  try {
    const authors = await searchBrandAuthors(name);
    if (authors.length === 0) {
      return {
        ok: false,
        error: "일치하는 저자를 찾지 못했습니다. 저자명을 확인해 주세요.",
      };
    }
    return { ok: true, authors };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "저자 검색에 실패했습니다.",
    };
  }
}

export async function fetchAuthorEventsAction(): Promise<AuthorEventActionResult> {
  try {
    const events = await listAuthorEvents();
    return { ok: true, message: "ok", events };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "저자 이벤트 목록을 불러오지 못했습니다.",
    };
  }
}

export async function upsertAuthorEventAction(
  formData: FormData,
): Promise<AuthorEventActionResult> {
  try {
    const uid = String(formData.get("uid") ?? "").trim();
    const authorName = String(formData.get("author_name") ?? "").trim();
    const startDate = String(formData.get("start_date") ?? "").trim();
    const endDate = String(formData.get("end_date") ?? "").trim();

    if (!uid || !authorName || !startDate || !endDate) {
      return {
        ok: false,
        error: "저자 검색으로 UID를 선택한 뒤 기간을 입력해 주세요.",
      };
    }
    if (startDate > endDate) {
      return { ok: false, error: "종료일은 시작일 이후여야 합니다." };
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("author_events").upsert(
      {
        uid,
        author_name: authorName,
        start_date: startDate,
        end_date: endDate,
      },
      { onConflict: "uid" },
    );

    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    const events = await listAuthorEvents();
    return { ok: true, message: "이벤트가 저장되었습니다.", events };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "이벤트 저장에 실패했습니다.",
    };
  }
}

export async function deleteAuthorEventAction(
  uid: string,
): Promise<AuthorEventActionResult> {
  try {
    const trimmed = uid.trim();
    if (!trimmed) return { ok: false, error: "UID가 필요합니다." };

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("author_events")
      .delete()
      .eq("uid", trimmed);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    const events = await listAuthorEvents();
    return { ok: true, message: "이벤트가 삭제되었습니다.", events };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "이벤트 삭제에 실패했습니다.",
    };
  }
}
