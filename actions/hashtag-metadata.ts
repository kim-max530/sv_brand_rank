"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminSession } from "@/lib/admin-auth-server";
import { fetchBrandInfoList } from "@/lib/csv";
import { parseHashtags } from "@/lib/hashtags";
import {
  fetchHashtagMetadataRows,
  setHashtagHidden,
  upsertHashtagDescription,
  type HashtagMetadataRow,
} from "@/lib/hashtag-metadata";
import { warmHashtagAuthorIndex } from "@/lib/hashtag-index";

export type HashtagInfoAdminRow = {
  tag: string;
  description: string;
  isHidden: boolean;
  authorCount: number;
};

export type HashtagMetadataActionResult =
  | { ok: true; message: string; rows?: HashtagInfoAdminRow[] }
  | { ok: false; error: string };

async function requireAdmin(): Promise<{ ok: false; error: string } | null> {
  if (await requireAdminSession()) return null;
  return { ok: false, error: "관리자 로그인이 필요합니다." };
}

function invalidateHashtagViews(): void {
  revalidateTag("hashtag-metadata", { expire: 0 });
  revalidateTag("hashtag-data", { expire: 0 });
  revalidateTag("ranking-data", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/hashtag", "layout");
}

async function buildAdminRows(): Promise<HashtagInfoAdminRow[]> {
  const [brands, metadata] = await Promise.all([
    fetchBrandInfoList({
      applyOverrides: true,
      stripHidden: false,
      injectChampions: true,
    }),
    fetchHashtagMetadataRows(),
  ]);

  const metaByTag = new Map<string, HashtagMetadataRow>();
  for (const row of metadata) {
    metaByTag.set(row.tag.toLowerCase(), row);
  }

  const authorCounts = new Map<string, { label: string; count: number }>();
  for (const info of brands) {
    const seen = new Set<string>();
    for (const tag of parseHashtags(info.record2)) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const prev = authorCounts.get(key);
      if (prev) prev.count += 1;
      else authorCounts.set(key, { label: tag, count: 1 });
    }
  }

  // brand_info 태그 + 메타데이터에만 있는 태그(숨김 등) 합집합
  const allKeys = new Set<string>([
    ...authorCounts.keys(),
    ...metaByTag.keys(),
  ]);

  const rows: HashtagInfoAdminRow[] = [];
  for (const key of allKeys) {
    const fromCount = authorCounts.get(key);
    const meta = metaByTag.get(key);
    const tag = fromCount?.label ?? meta?.tag ?? key;
    rows.push({
      tag,
      description: meta?.description ?? "",
      isHidden: meta?.isHidden ?? false,
      authorCount: fromCount?.count ?? 0,
    });
  }

  rows.sort((a, b) => a.tag.localeCompare(b.tag, "ko"));
  return rows;
}

export async function fetchHashtagInfoAdminAction(): Promise<
  | { ok: true; rows: HashtagInfoAdminRow[] }
  | { ok: false; error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return { ok: true, rows: await buildAdminRows() };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "해시태그 정보를 불러오지 못했습니다.",
    };
  }
}

export async function saveHashtagDescriptionAction(
  tag: string,
  description: string,
): Promise<HashtagMetadataActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await upsertHashtagDescription(tag, description);
  if (!result.ok) return result;

  invalidateHashtagViews();
  try {
    await warmHashtagAuthorIndex();
  } catch (error) {
    console.warn("[hashtag-index] warm failed", error);
  }

  return {
    ok: true,
    message: `#${tag.replace(/^#+/, "").trim()} 설명이 저장되었습니다.`,
    rows: await buildAdminRows(),
  };
}

export async function hideHashtagAction(
  tag: string,
): Promise<HashtagMetadataActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const normalized = tag.replace(/^#+/, "").trim();
  const result = await setHashtagHidden(normalized, true);
  if (!result.ok) return result;

  invalidateHashtagViews();
  try {
    await warmHashtagAuthorIndex();
  } catch (error) {
    console.warn("[hashtag-index] warm failed", error);
  }

  return {
    ok: true,
    message: `#${normalized} 태그가 숨김 처리되었습니다. 서비스 화면에서 노출되지 않습니다.`,
    rows: await buildAdminRows(),
  };
}

export async function restoreHashtagAction(
  tag: string,
): Promise<HashtagMetadataActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const normalized = tag.replace(/^#+/, "").trim();
  const result = await setHashtagHidden(normalized, false);
  if (!result.ok) return result;

  invalidateHashtagViews();
  try {
    await warmHashtagAuthorIndex();
  } catch (error) {
    console.warn("[hashtag-index] warm failed", error);
  }

  return {
    ok: true,
    message: `#${normalized} 태그 노출이 복구되었습니다.`,
    rows: await buildAdminRows(),
  };
}
