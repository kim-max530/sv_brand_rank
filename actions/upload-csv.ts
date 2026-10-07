"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CURR_RANKING_UPLOAD_FILES,
  PREV_RANKING_UPLOAD_FILES,
} from "@/lib/constants";

const STORAGE_BUCKET = "weekly_ranking";

const ALLOWED_FILES = new Set<string>([
  "brand_info.csv",
  ...CURR_RANKING_UPLOAD_FILES.map(({ file }) => file),
  ...PREV_RANKING_UPLOAD_FILES.map(({ file }) => file),
]);

function invalidateRankingPages(): void {
  revalidateTag("ranking-data", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/hashtag", "layout");
}

function validateBrandInfoCsv(buffer: Buffer): string | null {
  const firstLine =
    buffer.toString("utf8").replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const headers = firstLine
    .split(",")
    .map((value) => value.trim().replace(/^"|"$/g, "").toLowerCase());
  const hasUid = headers.some((value) =>
    ["uid", "brand_id"].includes(value),
  );
  const hasTags = headers.some((value) =>
    ["record2", "record 2", "record_2", "hashtag", "hashtags"].includes(
      value,
    ),
  );
  if (!hasUid || !hasTags) {
    return "brand_info.csv에는 UID와 record2(태그) 열이 반드시 필요합니다.";
  }
  return null;
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

  if (file.name.toLowerCase() !== targetName.toLowerCase()) {
    return {
      ok: false,
      error: `선택한 파일명을 ${targetName}(으)로 맞춰 주세요.`,
    };
  }

  const client = getSupabaseOrError();
  if (!client.ok) return client;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (targetName === "brand_info.csv") {
      const validationError = validateBrandInfoCsv(buffer);
      if (validationError) return { ok: false, error: validationError };
    }

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

    const kind = targetName.startsWith("prev_")
      ? "지난주"
      : targetName === "brand_info.csv"
        ? "브랜드 정보"
        : "이번 주";

    return {
      ok: true,
      message: `${kind} 업로드 완료 (${targetName})`,
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
