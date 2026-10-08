import { unstable_cache } from "next/cache";
import { fetchActiveAuthorEvents } from "@/lib/author-events";
import { fetchAuthorStatsForUids } from "@/lib/author-stats";
import {
  fetchAuthorSubjectsByUid,
  fetchBrandInfoList,
  fetchMergedRankings,
} from "@/lib/csv";
import { fetchHiddenHashtagSet } from "@/lib/hashtag-metadata";
import {
  parseHashtags,
  resolveSystemBadgeTag,
  type SystemBadgeTag,
} from "@/lib/hashtags";
import type { BrandInfo, MergedRanking, Subject } from "@/types/ranking";

type MutableAuthorMeta = {
  isInPopular: boolean;
  isInRecommend: boolean;
  inGrowth: boolean;
  inRepurchase: boolean;
  inSearch: boolean;
  subjects: Set<Subject>;
};

type TagEntry = {
  label: string;
  uids: string[];
  relatedTags: string[];
};

type HashtagAuthorIndex = {
  authorsByUid: Record<string, MergedRanking>;
  tags: Record<string, TagEntry>;
  systemUids: Record<SystemBadgeTag, string[]>;
};

export type HashtagPageData = {
  authors: MergedRanking[];
  relatedTags: string[];
};

function safeAddress(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function toAuthorView(
  info: BrandInfo,
  meta: MutableAuthorMeta | undefined,
  totalClicks: number,
  eventDiscount: number | undefined,
): MergedRanking {
  const subjects = meta ? [...meta.subjects] : [];
  return {
    ...info,
    과목: (subjects[0] ?? "영어") as Subject,
    subjects,
    rank: 0,
    category: "인기",
    badge: null,
    changeText: "",
    totalClicks,
    hasEvent: eventDiscount != null,
    eventDiscount,
    isInPopular: meta?.isInPopular ?? false,
    isInRecommend: meta?.isInRecommend ?? false,
    inGrowth: meta?.inGrowth ?? false,
    inRepurchase: meta?.inRepurchase ?? false,
    inSearch: meta?.inSearch ?? false,
  };
}

function sortAuthors(a: MergedRanking, b: MergedRanking): number {
  if (a.isInPopular !== b.isInPopular) {
    return a.isInPopular ? -1 : 1;
  }
  return a.저자명.localeCompare(b.저자명, "ko");
}

async function buildHashtagAuthorIndex(): Promise<HashtagAuthorIndex> {
  const [brandInfo, rankings, eventMap, hidden, subjectsByUid] =
    await Promise.all([
      fetchBrandInfoList(),
      fetchMergedRankings(),
      fetchActiveAuthorEvents(),
      fetchHiddenHashtagSet(),
      fetchAuthorSubjectsByUid(),
    ]);

  const metaByUid = new Map<string, MutableAuthorMeta>();
  for (const row of rankings) {
    const current = metaByUid.get(row.UID) ?? {
      isInPopular: false,
      isInRecommend: false,
      inGrowth: false,
      inRepurchase: false,
      inSearch: false,
      subjects: new Set<Subject>(),
    };
    if (row.category === "인기") current.isInPopular = true;
    if (row.category === "추천") current.isInRecommend = true;
    if (row.inGrowth) current.inGrowth = true;
    if (row.inRepurchase) current.inRepurchase = true;
    if (row.inSearch) current.inSearch = true;
    current.subjects.add(row.과목);
    metaByUid.set(row.UID, current);
  }

  // 인기/추천 상위권뿐 아니라 전체 랭킹 CSV 등장 과목을 병합 (혼합 노출 방지)
  for (const [uid, subjects] of subjectsByUid) {
    const current = metaByUid.get(uid) ?? {
      isInPopular: false,
      isInRecommend: false,
      inGrowth: false,
      inRepurchase: false,
      inSearch: false,
      subjects: new Set<Subject>(),
    };
    for (const subject of subjects) {
      current.subjects.add(subject);
    }
    metaByUid.set(uid, current);
  }

  const clickMap = await fetchAuthorStatsForUids(
    brandInfo.map((item) => item.UID),
  );
  const authors = brandInfo.map((info) =>
    toAuthorView(
      info,
      metaByUid.get(info.UID),
      clickMap.get(info.UID) ?? 0,
      eventMap.get(info.UID),
    ),
  );
  const authorsByUid = Object.fromEntries(
    authors.map((author) => [author.UID, author]),
  );

  const tagUidSets = new Map<string, { label: string; uids: Set<string> }>();
  const relatedCounts = new Map<
    string,
    Map<string, { label: string; count: number }>
  >();

  for (const author of authors) {
    if (!safeAddress(author.address)) continue;
    const tags = parseHashtags(author.record2).filter(
      (tag) => !hidden.has(tag.toLowerCase()),
    );
    for (const tag of tags) {
      const key = tag.toLowerCase();
      const entry = tagUidSets.get(key) ?? {
        label: tag,
        uids: new Set<string>(),
      };
      entry.uids.add(author.UID);
      tagUidSets.set(key, entry);

      const related = relatedCounts.get(key) ?? new Map();
      for (const otherTag of tags) {
        const otherKey = otherTag.toLowerCase();
        if (otherKey === key) continue;
        if (hidden.has(otherKey)) continue;
        const current = related.get(otherKey);
        if (current) current.count += 1;
        else related.set(otherKey, { label: otherTag, count: 1 });
      }
      relatedCounts.set(key, related);
    }
  }

  const tags: Record<string, TagEntry> = {};
  for (const [key, entry] of tagUidSets) {
    const relatedTags = [...(relatedCounts.get(key)?.values() ?? [])]
      .sort(
        (a, b) =>
          b.count - a.count || a.label.localeCompare(b.label, "ko"),
      )
      .slice(0, 7)
      .map((item) => item.label);
    tags[key] = {
      label: entry.label,
      uids: [...entry.uids].sort((a, b) =>
        sortAuthors(authorsByUid[a], authorsByUid[b]),
      ),
      relatedTags,
    };
  }

  const sortedAuthors = [...authors].sort(sortAuthors);
  const systemUids: Record<SystemBadgeTag, string[]> = {
    재구매: sortedAuthors
      .filter((author) => author.inRepurchase)
      .map((author) => author.UID),
    HOT: sortedAuthors
      .filter((author) => author.inGrowth)
      .map((author) => author.UID),
    검색어: sortedAuthors
      .filter((author) => author.inSearch)
      .map((author) => author.UID),
    인기Top: sortedAuthors
      .filter((author) => author.isInPopular)
      .map((author) => author.UID),
    쏠북Pick: sortedAuthors
      .filter((author) => author.isInRecommend)
      .map((author) => author.UID),
  };

  return { authorsByUid, tags, systemUids };
}

const getCachedHashtagAuthorIndex = unstable_cache(
  buildHashtagAuthorIndex,
  ["hashtag-author-index-v3"],
  {
    revalidate: 300,
    tags: ["ranking-data", "hashtag-data", "hashtag-metadata", "author-events"],
  },
);

export async function getHashtagPageData(
  tag: string,
): Promise<HashtagPageData> {
  const [index, hidden] = await Promise.all([
    getCachedHashtagAuthorIndex(),
    fetchHiddenHashtagSet(),
  ]);
  const systemTag = resolveSystemBadgeTag(tag);
  const key = tag.replace(/^#+/, "").trim().toLowerCase();

  // 숨김 처리된 일반 태그는 서비스에서 완전 비노출
  if (!systemTag && hidden.has(key)) {
    return { authors: [], relatedTags: [] };
  }

  const entry = index.tags[key];
  const uids = systemTag ? index.systemUids[systemTag] : (entry?.uids ?? []);

  return {
    authors: uids
      .map((uid) => index.authorsByUid[uid])
      .filter((author): author is MergedRanking => Boolean(author)),
    relatedTags: systemTag ? [] : (entry?.relatedTags ?? []),
  };
}

/** Admin 데이터 갱신 직후 호출해 다음 태그 클릭 전에 인덱스를 미리 생성한다. */
export async function warmHashtagAuthorIndex(): Promise<void> {
  await getCachedHashtagAuthorIndex();
}
