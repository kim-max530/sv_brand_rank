"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { warmHashtagAuthorIndex } from "@/lib/hashtag-index";

const STORAGE_BUCKET = "weekly_ranking";
const BRAND_INFO_FILE = "brand_info.csv";

export type BrandInfoStatus =
  | {
      ok: true;
      source: "storage" | "bundled";
      rowCount: number;
      withAddress: number;
      withTags: number;
      sampleTags: string[];
      updatedHint: string;
    }
  | { ok: false; error: string };

function parseHeader(line: string): string[] {
  return line
    .replace(/^\uFEFF/, "")
    .split(",")
    .map((value) => value.trim().replace(/^"|"$/g, "").toLowerCase());
}

function validateBrandInfoCsv(text: string): string | null {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const headers = parseHeader(firstLine);
  const hasUid = headers.some((value) => ["uid", "brand_id"].includes(value));
  const hasTags = headers.some((value) =>
    ["record2", "record 2", "record_2", "hashtag", "hashtags", "태그", "해시태그"].includes(
      value,
    ),
  );
  if (!hasUid || !hasTags) {
    return "brand_info.csv에는 UID와 record2(태그) 열이 반드시 필요합니다.";
  }
  return null;
}

function countBrandFields(text: string): {
  rowCount: number;
  withAddress: number;
  withTags: number;
  sampleTags: string[];
} {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return { rowCount: 0, withAddress: 0, withTags: 0, sampleTags: [] };
  }
  const headers = parseHeader(lines[0]);
  const uidIdx = headers.findIndex((h) => ["uid", "brand_id"].includes(h));
  const addressIdx = headers.findIndex((h) =>
    ["address", "brand_address"].includes(h),
  );
  const record2Idx = headers.findIndex((h) =>
    ["record2", "record 2", "record_2", "hashtag", "hashtags", "태그", "해시태그"].includes(
      h,
    ),
  );

  let withAddress = 0;
  let withTags = 0;
  const sampleTags: string[] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    if (uidIdx >= 0 && !String(cols[uidIdx] ?? "").trim()) continue;
    if (addressIdx >= 0 && String(cols[addressIdx] ?? "").trim()) withAddress += 1;
    const tags = record2Idx >= 0 ? String(cols[record2Idx] ?? "").trim() : "";
    if (tags) {
      withTags += 1;
      if (sampleTags.length < 5) {
        sampleTags.push(tags.split(/[,|]/)[0]?.replace(/^#/, "").trim() || tags);
      }
    }
  }

  return {
    rowCount: Math.max(0, lines.length - 1),
    withAddress,
    withTags,
    sampleTags: sampleTags.filter(Boolean),
  };
}

export async function getBrandInfoStatusAction(): Promise<BrandInfoStatus> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(BRAND_INFO_FILE);

    if (!error && data) {
      const text = await data.text();
      const validationError = validateBrandInfoCsv(text);
      if (!validationError) {
        const stats = countBrandFields(text);
        return {
          ok: true,
          source: "storage",
          ...stats,
          updatedHint: "Storage의 brand_info.csv를 사용 중입니다.",
        };
      }
      return {
        ok: false,
        error: `Storage brand_info.csv가 유효하지 않습니다. (${validationError})`,
      };
    }

    return {
      ok: false,
      error:
        error?.message ||
        "Storage에 brand_info.csv가 없습니다. 정상 CSV를 업로드해 주세요.",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "브랜드 정보 상태를 확인하지 못했습니다.",
    };
  }
}

/** 파일명이 달라도 내용이 유효하면 brand_info.csv로 저장한다. */
export async function uploadBrandInfoCsv(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "업로드할 파일이 없습니다." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false, error: "CSV 파일만 업로드할 수 있습니다." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = buffer.toString("utf8");
    const validationError = validateBrandInfoCsv(text);
    if (validationError) return { ok: false, error: validationError };

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(BRAND_INFO_FILE, buffer, {
        upsert: true,
        contentType: "text/csv; charset=utf-8",
        cacheControl: "0",
      });

    if (error) {
      return { ok: false, error: error.message || "업로드에 실패했습니다." };
    }

    revalidateTag("ranking-data", { expire: 0 });
    revalidateTag("hashtag-data", { expire: 0 });
    revalidatePath("/");
    revalidatePath("/hashtag", "layout");
    revalidatePath("/admin");

    try {
      await warmHashtagAuthorIndex();
    } catch (warmError) {
      console.warn("[brand-info] warm failed", warmError);
    }

    const stats = countBrandFields(text);
    return {
      ok: true,
      message: `브랜드 정보 업로드 완료 (행 ${stats.rowCount} · 태그 ${stats.withTags}건). 서비스에 즉시 반영했습니다.`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "업로드에 실패했습니다.",
    };
  }
}
