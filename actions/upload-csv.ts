"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RANKING_FILES } from "@/lib/constants";

const STORAGE_BUCKET = "weekly_ranking";

const ALLOWED_FILES = new Set<string>([
  "brand_info.csv",
  ...RANKING_FILES.map(({ file }) => file),
]);

export type UploadCsvResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function uploadRankingCsv(
  formData: FormData,
): Promise<UploadCsvResult> {
  const targetName = String(formData.get("targetName") ?? "");
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

  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Supabase 관리자 설정을 확인하세요.",
    };
  }

  try {
    if (targetName.startsWith("rank_")) {
      const prevName = `prev_${targetName}`;
      const { data: existing, error: downloadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(targetName);

      if (!downloadError && existing) {
        const { error: backupError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(prevName, existing, {
            upsert: true,
            contentType: "text/csv",
            cacheControl: "3600",
          });

        if (backupError) {
          return {
            ok: false,
            error: `이전 랭킹 백업 실패: ${backupError.message}`,
          };
        }
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(targetName, buffer, {
        upsert: true,
        contentType: "text/csv",
        cacheControl: "3600",
      });

    if (error) {
      return {
        ok: false,
        error: error.message || "업로드에 실패했습니다.",
      };
    }

    return {
      ok: true,
      message: targetName.startsWith("rank_")
        ? "업로드 완료 (이전 파일은 prev_ 로 보관됨)"
        : "업로드 완료",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "업로드에 실패했습니다.",
    };
  }
}
