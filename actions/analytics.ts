"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AnalyticsPeriod = "day" | "week" | "month";

/** Admin 사용 데이터 대시보드용 집계 */
export interface AnalyticsSummary {
  period: AnalyticsPeriod;
  rangeStart: string;
  rangeEnd: string;
  metrics: {
    /** 접속 횟수 (Session views) */
    sessionViews: number;
    /** 접속자수 (Unique Visitors) */
    uniqueVisitors: number;
    /** 홈페이지 연결 */
    homeLinkClicks: number;
    /** 탭 - 브랜드 랭킹 */
    tabBrand: number;
    /** 탭 - 추천 랭킹 */
    tabRecommend: number;
    /** 탭 - 인기 #태그 */
    tabHashtag: number;
    /** 탭 - 교재별 랭킹 */
    tabTextbook: number;
    /** 해시태그 클릭 */
    hashtagClicks: number;
    /** 배너 클릭 */
    bannerClicks: number;
    /** 프로필 클릭 (참고) */
    profileClicks: number;
    /** 평균 클릭 수 (전체 클릭 / 접속자수), 소수 1자리 */
    avgClicksPerVisitor: number;
  };
  totals: {
    page_view: number;
    tab_click: number;
    profile_click: number;
    homepage_click: number;
    hashtag_click: number;
    banner_click: number;
    all: number;
  };
  byTarget: Array<{
    event_type: string;
    target_name: string;
    count: number;
  }>;
  byBucket: Array<{
    label: string;
    page_view: number;
    tab_click: number;
    profile_click: number;
    homepage_click: number;
    hashtag_click: number;
    banner_click: number;
    all: number;
  }>;
}

const TAB_BRAND = "브랜드 랭킹";
const TAB_RECOMMEND = "추천 랭킹";
const TAB_HASHTAG = "인기 #태그";
const TAB_TEXTBOOK = "교재별 랭킹";

function normalizeTabTarget(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t === TAB_BRAND || t === "인기" || t === "brand") return TAB_BRAND;
  if (t === TAB_RECOMMEND || t === "추천" || t === "recommend")
    return TAB_RECOMMEND;
  if (
    t === TAB_HASHTAG ||
    t === "해시검색" ||
    t === "search" ||
    t.includes("#태그") ||
    t === "#태그"
  ) {
    return TAB_HASHTAG;
  }
  if (t === TAB_TEXTBOOK || t.includes("교재")) return TAB_TEXTBOOK;
  return t;
}

export interface HashtagSearchData {
  topTags: Array<{
    tag: string;
    count: number;
    authorCount: number;
    description: string;
  }>;
  recentTags: Array<{ tag: string; created_at: string }>;
}

export interface LiveHashtagRankItem {
  tag: string;
  /** 클릭 수 (순위 산정용) */
  clickCount: number;
  /** 해당 해시태그 보유 저자 수 */
  authorCount: number;
  rank: number;
}

function toKstDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startOfPeriod(period: AnalyticsPeriod): Date {
  const now = new Date();
  if (period === "day") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(now);
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketKey(iso: string, period: AnalyticsPeriod): string {
  const date = new Date(iso);
  if (period === "day") {
    return toKstDate(date);
  }
  if (period === "week") {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return `${toKstDate(d)} 주`;
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  return `${y}-${m}`;
}

function normalizeTag(value: unknown): string {
  return String(value ?? "")
    .replace(/^#+/, "")
    .trim();
}

export async function fetchHashtagSearchData(): Promise<
  { ok: true; data: HashtagSearchData } | { ok: false; error: string }
> {
  try {
    const [
      { fetchBrandInfoList },
      { parseHashtags },
      { fetchHashtagDescriptionMap, fetchHiddenHashtagSet },
    ] = await Promise.all([
      import("@/lib/csv"),
      import("@/lib/hashtags"),
      import("@/lib/hashtag-metadata"),
    ]);

    const supabase = getSupabaseAdminClient();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);

    const [topResult, recentResult, hidden, descriptions, brands] =
      await Promise.all([
        supabase
          .from("analytics_events")
          .select("target_name, created_at")
          .eq("event_type", "hashtag_click")
          .gte("created_at", from.toISOString())
          .not("target_name", "is", null)
          .limit(3000),
        supabase
          .from("analytics_events")
          .select("target_name, created_at")
          .eq("event_type", "hashtag_click")
          .not("target_name", "is", null)
          .order("created_at", { ascending: false })
          .limit(30),
        fetchHiddenHashtagSet(),
        fetchHashtagDescriptionMap(),
        fetchBrandInfoList(),
      ]);

    if (topResult.error) {
      return { ok: false, error: topResult.error.message };
    }
    if (recentResult.error) {
      return { ok: false, error: recentResult.error.message };
    }

    const authorCounts = new Map<string, number>();
    for (const info of brands) {
      const seen = new Set<string>();
      for (const tag of parseHashtags(info.record2)) {
        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        authorCounts.set(key, (authorCounts.get(key) ?? 0) + 1);
      }
    }

    const counts = new Map<string, { label: string; count: number }>();
    for (const row of topResult.data ?? []) {
      const tag = normalizeTag(row.target_name);
      if (!tag) continue;
      if (hidden.has(tag.toLowerCase())) continue;
      const key = tag.toLowerCase();
      const prev = counts.get(key);
      if (prev) prev.count += 1;
      else counts.set(key, { label: tag, count: 1 });
    }

    const topTags = [...counts.values()]
      .map((item) => ({
        tag: item.label,
        count: item.count,
        authorCount: authorCounts.get(item.label.toLowerCase()) ?? 0,
        description: descriptions.get(item.label.toLowerCase()) ?? "",
      }))
      .sort(
        (a, b) =>
          b.count - a.count || a.tag.localeCompare(b.tag, "ko"),
      )
      .slice(0, 15);

    const recentTags: Array<{ tag: string; created_at: string }> = [];
    for (const row of recentResult.data ?? []) {
      const tag = normalizeTag(row.target_name);
      if (!tag) continue;
      if (hidden.has(tag.toLowerCase())) continue;
      recentTags.push({
        tag,
        created_at: String(row.created_at ?? ""),
      });
      if (recentTags.length >= 5) break;
    }

    return { ok: true, data: { topTags, recentTags } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "해시태그 데이터를 불러오지 못했습니다.",
    };
  }
}

/** 실시간 해시태그 Top 10 — 클릭 순위 + 저자 수 */
export async function fetchLiveHashtagRanking(): Promise<
  { ok: true; data: LiveHashtagRankItem[] } | { ok: false; error: string }
> {
  try {
    const search = await fetchHashtagSearchData();
    if (!search.ok) return search;

    const data = search.data.topTags.slice(0, 10).map((item, index) => ({
      tag: item.tag,
      clickCount: item.count,
      authorCount: item.authorCount,
      rank: index + 1,
    }));

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "실시간 해시태그 랭킹을 불러오지 못했습니다.",
    };
  }
}

export async function fetchAnalyticsSummary(
  period: AnalyticsPeriod,
): Promise<{ ok: true; data: AnalyticsSummary } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    const from = startOfPeriod(period);

    let rows: Array<{
      event_type: string | null;
      target_name: string | null;
      visitor_id?: string | null;
      created_at: string | null;
    }> = [];

    const withVisitor = await supabase
      .from("analytics_events")
      .select("event_type, target_name, visitor_id, created_at")
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: false })
      .limit(8000);

    if (withVisitor.error && /visitor_id/i.test(withVisitor.error.message)) {
      const fallback = await supabase
        .from("analytics_events")
        .select("event_type, target_name, created_at")
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: false })
        .limit(8000);
      if (fallback.error) {
        return { ok: false, error: fallback.error.message };
      }
      rows = fallback.data ?? [];
    } else if (withVisitor.error) {
      return { ok: false, error: withVisitor.error.message };
    } else {
      rows = withVisitor.data ?? [];
    }

    const totals = {
      page_view: 0,
      tab_click: 0,
      profile_click: 0,
      homepage_click: 0,
      hashtag_click: 0,
      banner_click: 0,
      all: rows.length,
    };

    const uniqueVisitors = new Set<string>();
    let tabBrand = 0;
    let tabRecommend = 0;
    let tabHashtag = 0;
    let tabTextbook = 0;

    const targetMap = new Map<string, number>();
    const bucketMap = new Map<
      string,
      {
        page_view: number;
        tab_click: number;
        profile_click: number;
        homepage_click: number;
        hashtag_click: number;
        banner_click: number;
        all: number;
      }
    >();

    for (const row of rows) {
      const type = String(row.event_type ?? "");
      if (type in totals && type !== "all") {
        totals[type as keyof Omit<typeof totals, "all">] += 1;
      }

      const visitorId = String(row.visitor_id ?? "").trim();
      if (visitorId) uniqueVisitors.add(visitorId);

      const target = String(row.target_name ?? "").trim() || "(없음)";
      if (type === "tab_click") {
        const tab = normalizeTabTarget(target);
        if (tab === TAB_BRAND) tabBrand += 1;
        else if (tab === TAB_RECOMMEND) tabRecommend += 1;
        else if (tab === TAB_HASHTAG) tabHashtag += 1;
        else if (tab === TAB_TEXTBOOK) tabTextbook += 1;
      }

      const targetKey = `${type}::${target}`;
      targetMap.set(targetKey, (targetMap.get(targetKey) ?? 0) + 1);

      const label = bucketKey(String(row.created_at), period);
      const bucket = bucketMap.get(label) ?? {
        page_view: 0,
        tab_click: 0,
        profile_click: 0,
        homepage_click: 0,
        hashtag_click: 0,
        banner_click: 0,
        all: 0,
      };
      bucket.all += 1;
      if (
        type === "page_view" ||
        type === "tab_click" ||
        type === "profile_click" ||
        type === "homepage_click" ||
        type === "hashtag_click" ||
        type === "banner_click"
      ) {
        bucket[type] += 1;
      }
      bucketMap.set(label, bucket);
    }

    const interactionClicks =
      totals.tab_click +
      totals.profile_click +
      totals.homepage_click +
      totals.hashtag_click +
      totals.banner_click;

    // visitor_id 미수집 구간 호환: page_view를 최소 방문자 하한으로 사용
    const uniqueCount =
      uniqueVisitors.size > 0 ? uniqueVisitors.size : totals.page_view;
    const avgClicksPerVisitor =
      uniqueCount > 0
        ? Math.round((interactionClicks / uniqueCount) * 10) / 10
        : 0;

    const byTarget = [...targetMap.entries()]
      .map(([key, count]) => {
        const [event_type, target_name] = key.split("::");
        return { event_type, target_name, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    const byBucket = [...bucketMap.entries()]
      .map(([label, counts]) => ({ label, ...counts }))
      .sort((a, b) => (a.label < b.label ? 1 : -1));

    return {
      ok: true,
      data: {
        period,
        rangeStart: toKstDate(from),
        rangeEnd: toKstDate(new Date()),
        metrics: {
          sessionViews: totals.page_view,
          uniqueVisitors: uniqueCount,
          homeLinkClicks: totals.homepage_click,
          tabBrand,
          tabRecommend,
          tabHashtag,
          tabTextbook,
          hashtagClicks: totals.hashtag_click,
          bannerClicks: totals.banner_click,
          profileClicks: totals.profile_click,
          avgClicksPerVisitor,
        },
        totals,
        byTarget,
        byBucket,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "애널리틱스 데이터를 불러오지 못했습니다.",
    };
  }
}
