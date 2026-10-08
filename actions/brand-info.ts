"use server";

import { readFile } from "fs/promises";
import path from "path";
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
      header: string;
    }
  | { ok: false; error: string; header?: string };

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function decodeCsvText(buffer: Buffer): string {
  const utf8 = stripBom(buffer.toString("utf8"));
  const header = utf8.split(/\r?\n/, 1)[0] ?? "";
  if (
    header.includes("UID") ||
    header.includes("uid") ||
    header.includes("저자명") ||
    header.includes("brand_id")
  ) {
    return utf8;
  }
  try {
    return stripBom(new TextDecoder("euc-kr").decode(buffer));
  } catch {
    return utf8;
  }
}

function parseHeader(line: string): string[] {
  return stripBom(line)
    .split(",")
    .map((value) => value.trim().replace(/^"|"$/g, "").toLowerCase());
}

function validateBrandInfoCsv(text: string): string | null {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const headers = parseHeader(firstLine);

  if (
    headers.includes("brand_name") &&
    headers.includes("range") &&
    !headers.includes("uid") &&
    !headers.includes("brand_id")
  ) {
    return "잘못된 brand_info입니다. (brand_name/range 형식) UID·address·record2 열이 있는 브랜드 정보 CSV를 올려 주세요.";
  }

  const hasUid = headers.some((value) => ["uid", "brand_id"].includes(value));
  const hasAddress = headers.some((value) =>
    ["address", "brand_address"].includes(value),
  );
  const hasTags = headers.some((value) =>
    [
      "record2",
      "record 2",
      "record_2",
      "hashtag",
      "hashtags",
      "태그",
      "해시태그",
    ].includes(value),
  );

  if (!hasUid) return "brand_info.csv에 UID(또는 brand_id) 열이 필요합니다.";
  if (!hasAddress) return "brand_info.csv에 address 열이 필요합니다.";
  if (!hasTags) return "brand_info.csv에 record2(태그) 열이 필요합니다.";
  return null;
}

function countBrandFields(text: string): {
  rowCount: number;
  withAddress: number;
  withTags: number;
  sampleTags: string[];
  header: string;
} {
  const lines = stripBom(text).split(/\r?\n/).filter(Boolean);
  const header = lines[0] ?? "";
  if (lines.length < 2) {
    return {
      rowCount: 0,
      withAddress: 0,
      withTags: 0,
      sampleTags: [],
      header,
    };
  }
  const headers = parseHeader(header);
  const uidIdx = headers.findIndex((h) => ["uid", "brand_id"].includes(h));
  const addressIdx = headers.findIndex((h) =>
    ["address", "brand_address"].includes(h),
  );
  const record2Idx = headers.findIndex((h) =>
    [
      "record2",
      "record 2",
      "record_2",
      "hashtag",
      "hashtags",
      "태그",
      "해시태그",
    ].includes(h),
  );

  let rowCount = 0;
  let withAddress = 0;
  let withTags = 0;
  const sampleTags: string[] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const uid = uidIdx >= 0 ? String(cols[uidIdx] ?? "").trim() : "";
    if (!uid) continue;
    rowCount += 1;
    if (addressIdx >= 0 && String(cols[addressIdx] ?? "").trim()) {
      withAddress += 1;
    }
    const tags = record2Idx >= 0 ? String(cols[record2Idx] ?? "").trim() : "";
    if (tags) {
      withTags += 1;
      if (sampleTags.length < 5) {
        sampleTags.push(
          tags.split(/[,|]/)[0]?.replace(/^#/, "").trim() || tags,
        );
      }
    }
  }

  return {
    rowCount,
    withAddress,
    withTags,
    sampleTags: sampleTags.filter(Boolean),
    header,
  };
}

async function invalidateRankingPages(): Promise<void> {
  revalidateTag("ranking-data", { expire: 0 });
  revalidateTag("hashtag-data", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/hashtag", "layout");
  revalidatePath("/admin");
  try {
    await warmHashtagAuthorIndex();
  } catch (error) {
    console.warn("[brand-info] warm failed", error);
  }
}

async function uploadBufferToStorage(
  buffer: Buffer,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const text = decodeCsvText(buffer);
  const validationError = validateBrandInfoCsv(text);
  if (validationError) return { ok: false, error: validationError };

  const stats = countBrandFields(text);
  if (stats.withAddress < 1) {
    return {
      ok: false,
      error: "address 값이 있는 행이 없습니다. 올바른 brand_info.csv인지 확인하세요.",
    };
  }

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

  const { data, error: downloadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(BRAND_INFO_FILE);
  if (downloadError || !data) {
    return {
      ok: false,
      error:
        downloadError?.message ||
        "업로드 후 Storage 검증에 실패했습니다. 다시 시도해 주세요.",
    };
  }

  const verifiedText = await data.text();
  const verifiedError = validateBrandInfoCsv(verifiedText);
  if (verifiedError) {
    return {
      ok: false,
      error: `업로드는 됐지만 Storage 파일이 유효하지 않습니다. (${verifiedError})`,
    };
  }
  const verified = countBrandFields(verifiedText);
  if (verified.withAddress < 1) {
    return {
      ok: false,
      error: "업로드 검증 실패: Storage에 address가 반영되지 않았습니다.",
    };
  }

  return { ok: true, text: verifiedText };
}

export async function getBrandInfoStatusAction(): Promise<BrandInfoStatus> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(BRAND_INFO_FILE);

    if (!error && data) {
      const text = await data.text();
      const header = text.split(/\r?\n/, 1)[0] ?? "";
      const validationError = validateBrandInfoCsv(text);
      if (!validationError) {
        const stats = countBrandFields(text);
        if (stats.withAddress > 0) {
          return {
            ok: true,
            source: "storage",
            ...stats,
            updatedHint: "Storage의 brand_info.csv를 사용 중입니다.",
          };
        }
        return {
          ok: false,
          error: "Storage brand_info에 address 값이 없습니다.",
          header,
        };
      }
      return {
        ok: false,
        error: `Storage brand_info.csv가 유효하지 않습니다. (${validationError})`,
        header,
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

function jsonArrayToBrandInfoCsv(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const rows = parsed.filter(
    (row): row is Record<string, unknown> =>
      !!row && typeof row === "object" && !Array.isArray(row),
  );
  if (rows.length === 0) return null;

  const keySet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) keySet.add(key);
  }
  const keys = Array.from(keySet);
  const hasUid = keys.some((k) =>
    ["uid", "brand_id", "UID"].includes(k),
  );
  if (!hasUid) return null;

  const escape = (value: unknown) => {
    const text = value == null ? "" : String(value);
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [
    keys.join(","),
    ...rows.map((row) => keys.map((key) => escape(row[key])).join(",")),
  ];
  return lines.join("\n");
}

/** 파일명이 달라도 내용이 유효하면 brand_info.csv로 저장한다. */
export async function uploadBrandInfoCsv(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "업로드할 파일이 없습니다." };
  }

  const lower = file.name.toLowerCase();
  const isCsv = lower.endsWith(".csv");
  const isJson = lower.endsWith(".json");
  if (!isCsv && !isJson) {
    return { ok: false, error: "CSV 또는 JSON 파일만 업로드할 수 있습니다." };
  }

  try {
    let buffer = Buffer.from(await file.arrayBuffer());
    if (isJson) {
      const csv = jsonArrayToBrandInfoCsv(buffer.toString("utf8"));
      if (!csv) {
        return {
          ok: false,
          error:
            "JSON은 UID(또는 brand_id) 필드가 있는 객체 배열이어야 합니다.",
        };
      }
      buffer = Buffer.from(csv, "utf8");
    }

    const uploaded = await uploadBufferToStorage(buffer);
    if (!uploaded.ok) return uploaded;

    await invalidateRankingPages();
    const stats = countBrandFields(uploaded.text);
    return {
      ok: true,
      message: `브랜드 정보 업로드·검증 완료 (행 ${stats.rowCount} · address ${stats.withAddress} · 태그 ${stats.withTags}). 서비스 캐시도 갱신했습니다.`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "업로드에 실패했습니다.",
    };
  }
}

/** Storage brand_info.csv 원본을 내려받기용으로 반환한다. */
export async function downloadBrandInfoCsvAction(): Promise<
  | { ok: true; filename: string; csv: string }
  | { ok: false; error: string }
> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(BRAND_INFO_FILE);

    if (error || !data) {
      return {
        ok: false,
        error:
          error?.message ||
          "Storage에 brand_info.csv가 없어 다운로드할 수 없습니다.",
      };
    }

    const csv = await data.text();
    if (!csv.trim()) {
      return { ok: false, error: "brand_info.csv 내용이 비어 있습니다." };
    }

    // Excel 한글 깨짐 방지 — 다운로드 응답에 UTF-8 BOM 보장
    const withBom = csv.startsWith("\uFEFF") ? csv : `\uFEFF${csv}`;

    return {
      ok: true,
      filename: "brand_info.csv",
      csv: withBom,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "브랜드 정보 다운로드에 실패했습니다.",
    };
  }
}

/** 배포본(public/data/brand_info.csv)으로 Storage를 강제로 복구한다. */
export async function restoreBrandInfoFromBundleAction(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  try {
    const buffer = await readFile(
      path.join(process.cwd(), "public", "data", "brand_info.csv"),
    );
    const uploaded = await uploadBufferToStorage(buffer);
    if (!uploaded.ok) return uploaded;

    await invalidateRankingPages();
    const stats = countBrandFields(uploaded.text);
    return {
      ok: true,
      message: `배포본 brand_info로 Storage 복구 완료 (행 ${stats.rowCount} · address ${stats.withAddress} · 태그 ${stats.withTags}).`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "배포본 복구에 실패했습니다.",
    };
  }
}
