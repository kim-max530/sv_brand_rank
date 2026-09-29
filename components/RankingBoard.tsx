"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Library, Search, UserRound } from "lucide-react";
import AuthorModal from "@/components/AuthorModal";
import HashtagChips, { type MetricChip } from "@/components/HashtagChips";
import HashtagSearchPanel from "@/components/HashtagSearchPanel";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  cacheAvatarSrc,
  getCachedAvatarSrc,
  getProfileImageCandidates,
  initialCandidateIndex,
} from "@/lib/brand-images";
import { DISPLAY_RANK_LIMIT } from "@/lib/constants";
import { formatClicks } from "@/lib/format-clicks";
import { bumpAuthorClicks } from "@/lib/author-stats-client";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_TO_TAB,
  FILTER_PILL_CLASS,
  FILTER_PILL_IDLE_CLASS,
  FILTER_PILL_SELECTED_CLASS,
  RANKING_CATEGORIES,
  SUBJECTS,
  TEXTBOOK_GROUP_FILTERS,
  categoryFromTabParam,
  productFiltersForSubject,
} from "@/lib/ranking-tabs";
import { openAuthorExternalLink } from "@/lib/solvook-links";
import type {
  MergedRanking,
  ProductFilter,
  RankBadge,
  RankingCategory,
  Subject,
  TextbookGroupFilter,
} from "@/types/ranking";

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.8 15.5v-7L16 12l-6.2 3.5Z" />
    </svg>
  );
}

function safeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function tabTargetName(category: RankingCategory): string {
  return (CATEGORY_LABELS[category] ?? String(category))
    .replace(/^\S+\s+/, "")
    .trim();
}

function StatusBadge({ badge }: { badge: RankBadge }) {
  if (badge === "NEW") {
    return (
      <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-sky-700">
        NEW
      </span>
    );
  }
  return null;
}

function RankMeta({
  rank,
  badge,
  changeText,
}: {
  rank: number;
  badge: RankBadge;
  changeText: string;
}) {
  const safeRank = Number.isFinite(rank) ? rank : 0;
  const showChange = Boolean(safeText(changeText)) && badge !== "NEW";

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
      <div className="flex w-11 shrink-0 flex-col items-center justify-center gap-0.5">
        {showChange ? (
          <span
            className={`text-[11px] font-semibold tabular-nums ${
              changeText.startsWith("▲")
                ? "text-red-500"
                : changeText.startsWith("▼")
                  ? "text-blue-500"
                  : "text-slate-300"
            }`}
          >
            {changeText}
          </span>
        ) : null}
        {badge ? <StatusBadge badge={badge} /> : null}
      </div>
      <span className="w-7 shrink-0 text-center font-display text-lg font-semibold tabular-nums text-slate-800 sm:w-8">
        {safeRank || "-"}
      </span>
    </div>
  );
}

function ProfileAvatar({
  uid,
  name,
  priority = false,
}: {
  uid: string;
  name: string;
  priority?: boolean;
}) {
  const candidates = getProfileImageCandidates(uid);
  const [index, setIndex] = useState(() =>
    initialCandidateIndex(candidates, getCachedAvatarSrc(uid)),
  );
  const src = candidates[index] ?? null;
  const failed = candidates.length === 0 || index >= candidates.length;

  if (!src || failed) {
    return (
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400"
        aria-hidden
      >
        <UserRound className="h-5 w-5" />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={name || "저자"}
      width={40}
      height={40}
      sizes="40px"
      quality={60}
      className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onLoad={() => cacheAvatarSrc(uid, src)}
      onError={() => setIndex((current) => current + 1)}
    />
  );
}

function openAuthorLink(item: MergedRanking) {
  trackAnalyticsEvent(
    "homepage_click",
    safeText(item.저자명) || safeText(item.UID),
  );
  openAuthorExternalLink(item);
}

function buildSystemBadgeChips(item: MergedRanking): MetricChip[] {
  const chips: MetricChip[] = [];
  if (item.inGrowth) {
    chips.push({
      key: "hot",
      label: "🚀HOT",
      tag: "HOT",
      title: "지난 주 고객 구매 증가가 가장 많았던 브랜드",
      className:
        "inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-600 transition hover:border-orange-300 hover:bg-orange-100",
    });
  }
  if (item.inRepurchase) {
    chips.push({
      key: "repurchase",
      label: "💖재구매",
      tag: "재구매",
      title: "지난 주 단골 고객들의 반복 구매가 가장 많았던 브랜드",
      className:
        "inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100",
    });
  }
  if (item.inSearch) {
    chips.push({
      key: "search",
      label: "🔍검색어",
      tag: "검색어",
      title: "지난 주 검색이 가장 많았던 브랜드",
      className:
        "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100",
    });
  }
  if (item.isInPopular) {
    chips.push({
      key: "popular",
      label: "🔥인기Top",
      tag: "인기Top",
      className:
        "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100",
    });
  }
  if (item.isInRecommend) {
    chips.push({
      key: "recommend",
      label: "✨쏠북Pick",
      tag: "쏠북Pick",
      className:
        "inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100",
    });
  }
  return chips;
}

function matchesProductFilter(
  item: MergedRanking,
  product: ProductFilter,
): boolean {
  if (product === "전체") return true;
  if (product === "변형문제") return Boolean(item.변형문제);
  if (product === "워크북") return Boolean(item.워크북);
  if (product === "분석지" || product === "분석") return Boolean(item.분석지);
  return true;
}

function matchesTextbookGroupFilter(
  item: MergedRanking,
  group: TextbookGroupFilter,
): boolean {
  if (group === "전체") return true;
  if (group === "교과서") return Boolean(item.교과서);
  if (group === "EBS") return Boolean(item.EBS);
  if (group === "부교재") return Boolean(item.부교재);
  if (group === "모의고사") return Boolean(item.모의고사);
  return true;
}

export function RankingRow({
  item,
  onOpenIntro,
  priority,
  showRank = true,
  layout = "default",
  totalClicks = 0,
  onMaterialsClick,
}: {
  item: MergedRanking;
  onOpenIntro: (item: MergedRanking) => void;
  priority?: boolean;
  showRank?: boolean;
  layout?: "default" | "hashtag";
  totalClicks?: number;
  onMaterialsClick?: (item: MergedRanking) => void;
}) {
  const authorName = safeText(item.저자명) || safeText(item.UID) || "이름 없음";
  const intro = safeText(item.intro);
  const info1 = safeText(item.info1);
  const info2 = safeText(item.info2);
  const record = safeText(item.record);
  const youtubeUrl = safeText(item.youtube_url);
  const address = safeText(item.address);
  const range3 = safeText(item.range3);
  const hasAuthorDetail = Boolean(info2 || record);
  const hasYoutube = Boolean(youtubeUrl);
  const hasInfo1 = Boolean(info1);
  const showEventBadge = Boolean(item.hasEvent);
  const metricChips = buildSystemBadgeChips(item);
  void layout;

  const openProfile = () => {
    if (!hasAuthorDetail && !hasYoutube) return;
    trackAnalyticsEvent("profile_click", authorName);
    onOpenIntro(item);
  };

  const handleActionClick = () => {
    if (address && onMaterialsClick) {
      onMaterialsClick(item);
      return;
    }
    openAuthorLink(item);
  };

  const profileClickable = hasAuthorDetail || hasYoutube;

  return (
    <div
      className={`flex w-full gap-4 overflow-hidden border-b border-slate-100 px-4 py-3 sm:gap-5 sm:px-5 ${
        hasInfo1 || item.record2 || metricChips.length > 0 || showEventBadge
          ? "items-start"
          : "items-center"
      }`}
    >
      {showRank ? (
        <div className="flex shrink-0 items-center self-start pt-0.5">
          <RankMeta
            rank={item.rank}
            badge={item.badge ?? null}
            changeText={item.changeText ?? ""}
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 items-start gap-4 overflow-hidden pr-3">
        <div className="flex w-12 shrink-0 flex-col items-center gap-1.5">
          <div
            className={`flex h-10 w-12 items-center justify-center rounded-lg ${
              profileClickable
                ? "cursor-pointer transition hover:bg-slate-50/80"
                : ""
            }`}
            onClick={profileClickable ? openProfile : undefined}
            onKeyDown={
              profileClickable
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openProfile();
                    }
                  }
                : undefined
            }
            role={profileClickable ? "button" : undefined}
            tabIndex={profileClickable ? 0 : undefined}
            aria-label={
              profileClickable ? `${authorName} 저자 소개 열기` : undefined
            }
          >
            <ProfileAvatar
              uid={item.UID}
              name={authorName}
              priority={priority}
            />
          </div>
          {showEventBadge ? (
            <span className="inline-flex items-center rounded-full border-none bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-sm">
              Event
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 overflow-hidden">
          <div
            className={`flex min-w-0 w-full items-center overflow-hidden whitespace-nowrap rounded-lg py-0.5 ${
              profileClickable
                ? "cursor-pointer transition hover:bg-slate-50/80"
                : ""
            }`}
            onClick={profileClickable ? openProfile : undefined}
            onKeyDown={
              profileClickable
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openProfile();
                    }
                  }
                : undefined
            }
            role={profileClickable ? "button" : undefined}
            tabIndex={profileClickable ? 0 : undefined}
            aria-label={
              profileClickable ? `${authorName} 저자 소개 열기` : undefined
            }
          >
            {intro ? (
              <>
                <span className="shrink-0 font-bold text-slate-900 text-sm sm:text-base">
                  {authorName},
                </span>
                <span className="ml-1 min-w-0 truncate text-[0.9em] text-slate-700">
                  {intro}
                </span>
              </>
            ) : (
              <span className="shrink-0 font-bold text-slate-900 text-sm sm:text-base">
                {authorName}
              </span>
            )}
          </div>

          {hasInfo1 ? (
            <p className="w-fit max-w-full break-keep rounded-2xl rounded-tl-none bg-gray-100 px-3 py-2 text-[0.7rem] leading-snug text-gray-700">
              {info1}
            </p>
          ) : null}

          <HashtagChips record2={item.record2} metricChips={metricChips} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-center">
        {hasYoutube ? (
          <button
            type="button"
            onClick={openProfile}
            className="shrink-0 rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-600"
            aria-label={`${authorName} 유튜브 소개 열기`}
          >
            <YoutubeIcon className="h-5 w-5" />
          </button>
        ) : null}

        <div className="flex w-40 flex-col items-center justify-center gap-1.5 sm:w-48">
          {range3 ? (
            <span className="line-clamp-3 w-full break-keep text-center text-xs leading-snug text-gray-500">
              {range3.endsWith("등") ? range3 : `${range3} 등`}
            </span>
          ) : null}
          {address ? (
            <button
              type="button"
              onClick={handleActionClick}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 transition-colors hover:text-gray-900"
              aria-label={`${authorName} 자료보기`}
            >
              <Library className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="tabular-nums">{formatClicks(totalClicks)}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleActionClick}
              className="rounded-lg p-1.5 text-gray-500 transition hover:text-gray-900"
              aria-label={`${authorName} 검색하기`}
            >
              <Search className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface RankingBoardProps {
  rankings: MergedRanking[];
  weekRangeLabel: string;
}

export default function RankingBoard({
  rankings,
  weekRangeLabel,
}: RankingBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = categoryFromTabParam(searchParams.get("tab"));

  const [subject, setSubject] = useState<Subject>("영어");
  const [product, setProduct] = useState<ProductFilter>("전체");
  const [textbookGroup, setTextbookGroup] =
    useState<TextbookGroupFilter>("전체");
  const [category, setCategory] = useState<RankingCategory>(
    () => tabFromUrl ?? "인기",
  );
  const [selectedAuthor, setSelectedAuthor] = useState<MergedRanking | null>(
    null,
  );
  const [clickCounts, setClickCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of rankings) {
      initial[item.UID] = item.totalClicks ?? 0;
    }
    return initial;
  });

  useEffect(() => {
    setClickCounts((prev) => {
      const next = { ...prev };
      for (const item of rankings) {
        if (next[item.UID] == null) {
          next[item.UID] = item.totalClicks ?? 0;
        }
      }
      return next;
    });
  }, [rankings]);

  const isHashtagSearch = category === "해시검색";
  const productOptions = productFiltersForSubject(subject);

  const handleMaterialsClick = (item: MergedRanking) => {
    openAuthorLink(item);
    if (!safeText(item.address)) return;

    setClickCounts((prev) => ({
      ...prev,
      [item.UID]: (prev[item.UID] ?? item.totalClicks ?? 0) + 1,
    }));
    setSelectedAuthor((current) =>
      current && current.UID === item.UID
        ? { ...current, totalClicks: (current.totalClicks ?? 0) + 1 }
        : current,
    );
    void bumpAuthorClicks(item.UID).then((serverCount) => {
      if (serverCount == null) return;
      setClickCounts((prev) => ({ ...prev, [item.UID]: serverCount }));
      setSelectedAuthor((current) =>
        current && current.UID === item.UID
          ? { ...current, totalClicks: serverCount }
          : current,
      );
    });
  };

  useEffect(() => {
    trackAnalyticsEvent("page_view");
  }, []);

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== category) {
      setCategory(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional URL-driven sync
  }, [tabFromUrl]);

  const selectSubject = (next: Subject) => {
    setSubject(next);
    setProduct("전체");
    setTextbookGroup("전체");
  };

  const list = useMemo(() => {
    if (isHashtagSearch || !Array.isArray(rankings)) return [];

    const limit = DISPLAY_RANK_LIMIT[subject] ?? 15;

    return rankings
      .filter((item) => {
        if (!item || item.category !== category) return false;
        if (item.과목 !== subject) return false;
        if (!Number.isFinite(item.rank) || item.rank > limit) return false;
        if (!matchesProductFilter(item, product)) return false;
        return matchesTextbookGroupFilter(item, textbookGroup);
      })
      .sort(
        (a, b) =>
          a.rank - b.rank || a.저자명.localeCompare(b.저자명, "ko"),
      );
  }, [
    rankings,
    subject,
    product,
    textbookGroup,
    category,
    isHashtagSearch,
  ]);

  const categoryDescription = CATEGORY_DESCRIPTIONS[category];

  const selectCategory = (next: RankingCategory) => {
    setCategory(next);
    trackAnalyticsEvent("tab_click", tabTargetName(next));
    const tab =
      next === "인기" || next === "추천" || next === "해시검색"
        ? CATEGORY_TO_TAB[next]
        : null;
    if (tab) {
      router.replace(`/?tab=${tab}`, { scroll: false });
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-1 sm:px-0">
      {!isHashtagSearch ? (
        <div role="tablist" aria-label="과목" className="flex flex-wrap gap-2">
          {SUBJECTS.map((item) => {
            const selected = item === subject;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectSubject(item)}
                className={`${FILTER_PILL_CLASS} ${
                  selected
                    ? FILTER_PILL_SELECTED_CLASS
                    : FILTER_PILL_IDLE_CLASS
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="랭킹 기준"
        className="flex flex-wrap justify-start gap-1.5 rounded-xl bg-slate-100/80 p-1.5"
      >
        {RANKING_CATEGORIES.map((item) => {
          const selected = item === category;
          const isSearchTab = item === "해시검색";
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectCategory(item)}
              className={`rounded-lg px-3 py-2 text-center text-xs font-medium whitespace-nowrap transition sm:text-sm ${
                selected
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isSearchTab ? (
                <span className="inline-flex items-center break-keep">
                  🔍 실시간{" "}
                  <span
                    aria-hidden
                    className="mx-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white"
                  >
                    #
                  </span>{" "}
                  검색
                </span>
              ) : (
                <span className="break-keep">{CATEGORY_LABELS[item]}</span>
              )}
            </button>
          );
        })}
      </div>

      {!isHashtagSearch ? (
        <>
          <div className="flex items-center justify-between gap-3 px-1">
            {productOptions.length > 0 ? (
              <div
                role="tablist"
                aria-label="자료 종류"
                className="flex min-w-0 flex-wrap justify-start gap-2"
              >
                {productOptions.map((item) => {
                  const selected = item === product;
                  return (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setProduct(item)}
                      className={`${FILTER_PILL_CLASS} ${
                        selected
                          ? FILTER_PILL_SELECTED_CLASS
                          : FILTER_PILL_IDLE_CLASS
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span aria-hidden />
            )}

            <div className="shrink-0 text-right">
              {weekRangeLabel ? (
                <p className="break-keep text-[0.525rem] leading-snug font-normal text-gray-400/80">
                  {weekRangeLabel}
                </p>
              ) : null}
              {categoryDescription ? (
                <p
                  className={`break-keep text-[0.525rem] leading-snug font-normal text-gray-400/80 ${
                    weekRangeLabel ? "mt-[0.1875rem]" : ""
                  }`}
                >
                  {categoryDescription}
                </p>
              ) : null}
            </div>
          </div>

          <div
            role="tablist"
            aria-label="교재 그룹"
            className="flex flex-wrap gap-2 px-1"
          >
            {TEXTBOOK_GROUP_FILTERS.map((item) => {
              const selected = item === textbookGroup;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTextbookGroup(item)}
                  className={`${FILTER_PILL_CLASS} ${
                    selected
                      ? FILTER_PILL_SELECTED_CLASS
                      : FILTER_PILL_IDLE_CLASS
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </>
      ) : categoryDescription ? (
        <div className="px-1 text-right">
          <p className="break-keep text-[0.525rem] leading-snug font-normal text-gray-400/80">
            {categoryDescription}
          </p>
        </div>
      ) : null}

      {isHashtagSearch ? (
        <HashtagSearchPanel />
      ) : (
        <div
          role="tabpanel"
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]"
        >
          {list.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-slate-500">
              표시할 랭킹 데이터가 없습니다.
            </p>
          ) : (
            <ul>
              {list.map((item, index) => (
                <li
                  key={`${item.category}-${item.과목}-${item.UID}-${item.rank}`}
                >
                  <RankingRow
                    item={item}
                    onOpenIntro={setSelectedAuthor}
                    priority={index < 8}
                    totalClicks={clickCounts[item.UID] ?? item.totalClicks ?? 0}
                    onMaterialsClick={handleMaterialsClick}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <AuthorModal
        author={
          selectedAuthor
            ? {
                ...selectedAuthor,
                totalClicks:
                  clickCounts[selectedAuthor.UID] ??
                  selectedAuthor.totalClicks ??
                  0,
              }
            : null
        }
        onClose={() => setSelectedAuthor(null)}
        onMaterialsClick={handleMaterialsClick}
      />
    </section>
  );
}
