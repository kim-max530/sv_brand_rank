import { unstable_cache } from "next/cache";
import { parseHashtags } from "@/lib/hashtags";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type HashtagMetadataRow = {
  tag: string;
  description: string;
  isHidden: boolean;
  updatedAt: string;
};

function normalizeTag(value: unknown): string {
  return String(value ?? "")
    .replace(/^#+/, "")
    .trim();
}

/** 숨김 태그를 제외한 record2 문자열 */
export function stripHiddenFromRecord2(
  record2: string | null | undefined,
  hidden: Set<string>,
): string | undefined {
  if (!record2?.trim()) return record2 ?? undefined;
  if (hidden.size === 0) return record2;
  const kept = parseHashtags(record2).filter(
    (tag) => !hidden.has(tag.toLowerCase()),
  );
  return kept.length > 0 ? kept.join(", ") : undefined;
}

export function filterVisibleTags(
  tags: string[],
  hidden: Set<string>,
): string[] {
  if (hidden.size === 0) return tags;
  return tags.filter((tag) => !hidden.has(tag.toLowerCase()));
}

async function loadHashtagMetadataRows(): Promise<HashtagMetadataRow[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("hashtag_metadata")
      .select("tag, description, is_hidden, updated_at");

    if (error) {
      console.warn("[hashtag_metadata]", error.message);
      return [];
    }

    return (data ?? [])
      .map((row) => {
        const tag = normalizeTag(row.tag);
        if (!tag) return null;
        return {
          tag,
          description: String(row.description ?? "").trim(),
          isHidden: Boolean(row.is_hidden),
          updatedAt: String(row.updated_at ?? ""),
        } satisfies HashtagMetadataRow;
      })
      .filter((row): row is HashtagMetadataRow => row != null);
  } catch (error) {
    console.warn("[hashtag_metadata]", error);
    return [];
  }
}

const getCachedHashtagMetadata = unstable_cache(
  loadHashtagMetadataRows,
  ["hashtag-metadata-v1"],
  {
    revalidate: 300,
    tags: ["hashtag-metadata", "hashtag-data"],
  },
);

export async function fetchHashtagMetadataRows(): Promise<HashtagMetadataRow[]> {
  return getCachedHashtagMetadata();
}

export async function fetchHiddenHashtagSet(): Promise<Set<string>> {
  const rows = await fetchHashtagMetadataRows();
  const hidden = new Set<string>();
  for (const row of rows) {
    if (row.isHidden) hidden.add(row.tag.toLowerCase());
  }
  return hidden;
}

export async function fetchHashtagDescriptionMap(): Promise<Map<string, string>> {
  const rows = await fetchHashtagMetadataRows();
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.isHidden) continue;
    if (!row.description) continue;
    map.set(row.tag.toLowerCase(), row.description);
  }
  return map;
}

export async function upsertHashtagDescription(
  tag: string,
  description: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeTag(tag);
  if (!normalized) return { ok: false, error: "해시태그가 필요합니다." };

  try {
    const supabase = getSupabaseAdminClient();
    const { data: existing } = await supabase
      .from("hashtag_metadata")
      .select("is_hidden")
      .eq("tag", normalized)
      .maybeSingle();

    const { error } = await supabase.from("hashtag_metadata").upsert(
      {
        tag: normalized,
        description: description.trim(),
        is_hidden: Boolean(existing?.is_hidden),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tag" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "해시태그 설명 저장에 실패했습니다.",
    };
  }
}

export async function setHashtagHidden(
  tag: string,
  isHidden: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeTag(tag);
  if (!normalized) return { ok: false, error: "해시태그가 필요합니다." };

  try {
    const supabase = getSupabaseAdminClient();
    const { data: existing } = await supabase
      .from("hashtag_metadata")
      .select("description")
      .eq("tag", normalized)
      .maybeSingle();

    const { error } = await supabase.from("hashtag_metadata").upsert(
      {
        tag: normalized,
        description: String(existing?.description ?? ""),
        is_hidden: isHidden,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tag" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "해시태그 숨김 처리에 실패했습니다.",
    };
  }
}
