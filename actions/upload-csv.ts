"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CURR_RANKING_UPLOAD_FILES,
  PREV_RANKING_UPLOAD_FILES,
  matchesRankingUploadFilename,
} from "@/lib/constants";

const STORAGE_BUCKET = "weekly_ranking";

/** 주간 랭킹 CSV만 취급. brand_info는 actions/brand-info.ts로 분리 */
const ALLOWED_FILES = new Set<string>([
  ...CURR_RANKING_UPLOAD_FILES.map(({ file }) => file),
  ...PREV_RANKING_UPLOAD_FILES.map(({ file }) => file),
]);

function invalidateRankingPages(): void {
  revalidateTag("ranking-data", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/hashtag", "layout");
}

export type UploadCsvResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function getSupabaseOrError():
  | { ok: true; supabase: ReturnType<typeof getSupabaseAdminClient> }
  | { ok: false; error: string } {
  try {
    return { ok: true, supabase: getSupabaseAdminClient() };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Supabase 관리자 설정을 확인하세요.",
    };
  }
}

/** 이번 주(rank_*) / 지난주(prev_rank_*) / brand_info 를 독립 업로드 (자동 백업 없음) */
export async function uploadRankingCsv(
  formData: FormData,
): Promise<UploadCsvResult> {
  const targetName = String(formData.get("targetName") ?? "").trim();
  const file = formData.get("file");

  if (!ALLOWED_FILES.has(targetName)) {
    return { ok: false, error: "허용되지 않은 파일명입니다." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "업로드할 파일이 없습니다." };
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false, error: "CSV 파일만 업로드할 수 있습니다." };
  }

  // 지난주(prev_*) 대상은 rank_*.csv로 올려도 되며 Storage에는 targetName(prev_*)으로 저장
  if (!matchesRankingUploadFilename(file.name, targetName)) {
    const hint = targetName.startsWith("prev_")
      ? `${targetName.replace(/^prev_/i, "")} 또는 ${targetName}`
      : targetName;
    return {
      ok: false,
      error: `선택한 파일명을 ${hint}(으)로 맞춰 주세요.`,
    };
  }

  const client = getSupabaseOrError();
  if (!client.ok) return client;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await client.supabase.storage
      .from(STORAGE_BUCKET)
      .upload(targetName, buffer, {
        upsert: true,
        contentType: "text/csv",
        cacheControl: "0",
      });

    if (error) {
      return {
        ok: false,
        error: error.message || "업로드에 실패했습니다.",
      };
    }

    invalidateRankingPages();

    const kind = targetName.startsWith("prev_") ? "지난주" : "이번 주";
    const renamed =
      targetName.startsWith("prev_") &&
      !file.name.toLowerCase().startsWith("prev_")
        ? ` · ${file.name} → ${targetName}`
        : "";

    return {
      ok: true,
      message: `${kind} 업로드 완료 (${targetName})${renamed}`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "업로드에 실패했습니다.",
    };
  }
}

/** Storage에서 지정 CSV 삭제 (초기화) */
export async function deleteRankingCsv(
  targetName: string,
): Promise<UploadCsvResult> {
  const name = targetName.trim();
  if (!ALLOWED_FILES.has(name)) {
    return { ok: false, error: "허용되지 않은 파일명입니다." };
  }

  const client = getSupabaseOrError();
  if (!client.ok) return client;

  try {
    const { error } = await client.supabase.storage
      .from(STORAGE_BUCKET)
      .remove([name]);

    if (error) {
      return { ok: false, error: error.message || "삭제에 실패했습니다." };
    }

    invalidateRankingPages();
    return { ok: true, message: `${name} 삭제(초기화) 완료` };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "삭제에 실패했습니다.",
    };
  }
}

/** 섹션 단위 일괄 초기화 */
export async function deleteRankingCsvBatch(
  targetNames: string[],
): Promise<UploadCsvResult> {
  const names = [
    ...new Set(
      targetNames.map((n) => n.trim()).filter((n) => ALLOWED_FILES.has(n)),
    ),
  ];
  if (names.length === 0) {
    return { ok: false, error: "삭제할 파일이 없습니다." };
  }

  const client = getSupabaseOrError();
  if (!client.ok) return client;

  try {
    const { error } = await client.supabase.storage
      .from(STORAGE_BUCKET)
      .remove(names);

    if (error) {
      return { ok: false, error: error.message || "일괄 삭제에 실패했습니다." };
    }

    invalidateRankingPages();
    return {
      ok: true,
      message: `${names.length}개 파일 초기화 완료`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "일괄 삭제에 실패했습니다.",
    };
  }
}
