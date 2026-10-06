"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Filter, Home, Search, UserRound } from "lucide-react";
import AuthorModal from "@/components/AuthorModal";
import HashtagChips from "@/components/HashtagChips";
import HashtagSearchPanel from "@/components/HashtagSearchPanel";
import LiveHashtagPanel from "@/components/LiveHashtagPanel";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  cacheAvatarSrc,
  getCachedAvatarSrc,
  getProfileImageCandidates,
  initialCandidateIndex,
} from "@/lib/brand-images";
import { DISPLAY_RANK_LIMIT } from "@/lib/constants";
import { bumpAuthorClicks } from "@/lib/author-stats-client";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_TO_TAB,
  COUPONS_HREF,
  FILTER_AUX_PILL_CLASS,
  FILTER_AUX_PILL_INVERSE_CLASS,
  FILTER_PILL_CLASS,
  FILTER_PILL_IDLE_CLASS,
  FILTER_PILL_SELECTED_CLASS,
  RANKING_CATEGORIES,
  SUBJECTS,
  TEXTBOOK_GROUP_FILTERS,
  TEXTBOOK_RANKING_HREF,
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

const AVATAR_PX = 52; // 40 * 1.3

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
  const rawChange = safeText(changeText);
  const showChange = Boolean(rawChange) && badge !== "NEW";
  const isUnchanged = rawChange === "-";

  const changeEl = showChange ? (
    <span
      className={
        isUnchanged
          ? "text-[11px] font-medium leading-none text-gray-400"
          : `text-[11px] font-semibold leading-none tabular-nums ${
              rawChange.startsWith("▲")
                ? "text-red-500"
                : rawChange.startsWith("▼")
                  ? "text-blue-500"
                  : "text-gray-400"
            }`
      }
    >
      {isUnchanged ? "-" : rawChange}
    </span>
  ) : badge === "NEW" ? (
    <StatusBadge badge={badge} />
  ) : (
    <span className="text-[11px] font-medium leading-none text-gray-400">-</span>
  );

  return (
    <div className="flex w-7 shrink-0 flex-col items-center gap-0.5 sm:w-8 lg:w-auto lg:flex-row lg:items-baseline lg:gap-2">
      <span className="text-center text-lg font-bold leading-none tabular-nums text-gray-900 sm:text-xl">
        {safeRank || "-"}
      </span>
      <div className="flex flex-col items-center gap-0.5 lg:items-start">
        {changeEl}
      </div>
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
  const sizeClass = "h-[52px] w-[52px]";

  if (!src || failed) {
    return (
      <span
        className={`flex ${sizeClass} items-center justify-center rounded-[10px] bg-slate-100 text-slate-400`}
        aria-hidden
      >
        <UserRound className="h-6 w-6" />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={name || "저자"}
      width={AVATAR_PX}
      height={AVATAR_PX}
      sizes={`${AVATAR_PX}px`}
      quality={60}
      className={`${sizeClass} rounded-[10px] object-cover`}
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

type SystemMedal = {
  key: string;
  label: string;
  title: string;
  className: string;
};

/** Top 5 전용 메달 뱃지 — 판매급등 / 재구매많음 / 인기검색어 */
function buildSystemMedals(item: MergedRanking): SystemMedal[] {
  const show =
    Number.isFinite(item.rank) && item.rank >= 1 && item.rank <= 5;
  if (!show) return [];

  const medals: SystemMedal[] = [];
  if (item.inGrowth) {
    medals.push({
      key: "hot",
      label: "판매급등",
      title: "지난 주 고객 구매 증가가 가장 많았던 브랜드",
      className:
        "inline-flex items-center rounded-full border border-orange-300 bg-gradient-to-b from-orange-50 to-orange-100 px-2 py-0.5 text-[10px] font-bold tracking-tight text-orange-700 shadow-sm",
    });
  }
  if (item.inRepurchase) {
    medals.push({
      key: "repurchase",
      label: "재구매많음",
      title: "지난 주 단골 고객들의 반복 구매가 가장 많았던 브랜드",
      className:
        "inline-flex items-center rounded-full border border-rose-300 bg-gradient-to-b from-rose-50 to-rose-100 px-2 py-0.5 text-[10px] font-bold tracking-tight text-rose-700 shadow-sm",
    });
  }
  if (item.inSearch) {
    medals.push({
      key: "search",
      label: "인기검색어",
      title: "지난 주 검색이 가장 많았던 브랜드",
      className:
        "inline-flex items-center rounded-full border border-sky-300 bg-gradient-to-b from-sky-50 to-sky-100 px-2 py-0.5 text-[10px] font-bold tracking-tight text-sky-700 shadow-sm",
    });
  }
  return medals;
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
  const info2 = safeText(item.info2);
  const record = safeText(item.record);
  const youtubeUrl = safeText(item.youtube_url);
  const address = safeText(item.address);
  const range3 = safeText(item.range3);
  const hasAuthorDetail = Boolean(info2 || record);
  const hasYoutube = Boolean(youtubeUrl);
  const showEventBadge = Boolean(item.hasEvent);
  const eventDiscount = item.eventDiscount ?? 35;
  const medals = buildSystemMedals(item);
  void layout;
  void range3;
  void medals; // 시스템 뱃지 일시 숨김 — 렌더 주석 보존용

  const openProfile = () => {
    if (!hasAuthorDetail && !hasYoutube) return;
    trackAnalyticsEvent("profile_click", authorName);
    onOpenIntro(item);
  };

  const openIntroModal = () => {
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

  const openCoupons = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    window.open(COUPONS_HREF, "_blank", "noopener,noreferrer");
  };

  const profileClickable = hasAuthorDetail || hasYoutube;
  void totalClicks;
  void openCoupons;
  void showEventBadge;
  void eventDiscount;
  void hasYoutube;

  return (
    <div className="flex w-full items-center gap-3 border-b border-gray-100 px-1 py-4 sm:gap-4 sm:px-2 lg:items-start lg:gap-5 lg:px-0 lg:py-5">
      {showRank ? (
        <RankMeta
          rank={item.rank}
          badge={item.badge ?? null}
          changeText={item.changeText ?? ""}
        />
      ) : null}

      <div
        className={`shrink-0 ${
          profileClickable ? "cursor-pointer transition hover:opacity-90" : ""
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

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={profileClickable ? openProfile : openIntroModal}
            className="shrink-0 text-left text-sm font-bold leading-none text-gray-900 sm:text-base"
          >
            {authorName}
          </button>
          {/* 시스템 뱃지(판매급등/재구매많음/인기검색어) — 일시 숨김, 코드 보존
          {medals.map((medal) => (
            <span
              key={medal.key}
              title={medal.title}
              className={medal.className}
            >
              {medal.label}
            </span>
          ))}
          */}
          <HashtagChips record2={item.record2} />
        </div>

        {intro ? (
          <p className="hidden max-w-xl break-keep rounded-lg bg-gray-100 px-3 py-2 text-xs leading-relaxed text-gray-600 lg:block">
            {intro}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1 self-center lg:self-start lg:pt-1">
        <button
          type="button"
          onClick={openIntroModal}
          className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:text-gray-800"
          aria-label={`${authorName} 저자 소개 열기`}
        >
          <UserRound className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
        <button
          type="button"
          onClick={handleActionClick}
          className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:text-gray-800"
          aria-label={
            address ? `${authorName} 홈페이지 열기` : `${authorName} 검색하기`
          }
        >
          {address ? (
            <Home className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          ) : (
            <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          )}
        </button>
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [category, setCategory] = useState<RankingCategory>(
    () => tabFromUrl ?? "인기",
  );
  const [selectedAuthor, setSelectedAuthor] = useState<MergedRanking | null>(
    null,
  );
  const [textbookConfirmOpen, setTextbookConfirmOpen] = useState(false);
  const [dontShowTextbookConfirm, setDontShowTextbookConfirm] = useState(false);
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

  const resetFilters = () => {
    setSubject("영어");
    setProduct("전체");
    setTextbookGroup("전체");
    setIsDetailOpen(false);
  };

  const list = useMemo(() => {
    if (category === "해시검색" || !Array.isArray(rankings)) return [];

    // 연산/필터는 전체 데이터 유지 — rank 상한으로 미리 자르지 않음
    return rankings
      .filter((item) => {
        if (!item || item.category !== category) return false;
        if (item.과목 !== subject) return false;
        if (!Number.isFinite(item.rank) || item.rank < 1) return false;
        if (!matchesProductFilter(item, product)) return false;
        return matchesTextbookGroupFilter(item, textbookGroup);
      })
      .sort(
        (a, b) =>
          a.rank - b.rank || a.저자명.localeCompare(b.저자명, "ko"),
      );
  }, [rankings, subject, product, textbookGroup, category]);

  /** 화면 렌더링만 영어 15 / 국어 10으로 제한 */
  const displayList = useMemo(() => {
    const limit = DISPLAY_RANK_LIMIT[subject] ?? 15;
    return list.slice(0, limit);
  }, [list, subject]);

  const categoryDescription = CATEGORY_DESCRIPTIONS[category];
  const isHashtagSearch = category === "해시검색";

  const selectCategory = (next: RankingCategory) => {
    if (next !== "인기" && next !== "추천" && next !== "해시검색") return;
    setCategory(next);
    trackAnalyticsEvent("tab_click", tabTargetName(next));
    const tab = CATEGORY_TO_TAB[next];
    if (tab) {
      router.replace(`/?tab=${tab}`, { scroll: false });
    }
  };

  const TEXTBOOK_SKIP_KEY = "solvook_skip_textbook_ranking_confirm";

  const goTextbookRanking = () => {
    window.open(TEXTBOOK_RANKING_HREF, "_blank", "noopener,noreferrer");
  };

  const handleTextbookRankingClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();
    try {
      if (window.localStorage.getItem(TEXTBOOK_SKIP_KEY) === "1") {
        goTextbookRanking();
        return;
      }
    } catch {
      // localStorage 불가 시 모달 표시
    }
    setDontShowTextbookConfirm(false);
    setTextbookConfirmOpen(true);
  };

  const confirmTextbookRanking = () => {
    if (dontShowTextbookConfirm) {
      try {
        window.localStorage.setItem(TEXTBOOK_SKIP_KEY, "1");
      } catch {
        // ignore
      }
    }
    setTextbookConfirmOpen(false);
    goTextbookRanking();
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-0">
      <div
        role="tablist"
        aria-label="과목"
        className="flex flex-wrap justify-center gap-2"
      >
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

      <div
        role="tablist"
        aria-label="랭킹 기준"
        className="flex w-full items-end gap-0 overflow-x-auto border-b border-gray-200"
      >
        {RANKING_CATEGORIES.map((item) => {
          const selected = item === category;
          const label = CATEGORY_LABELS[item];
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectCategory(item)}
              className={`relative shrink-0 px-3 py-3 text-sm whitespace-nowrap transition sm:px-4 sm:text-[15px] ${
                selected
                  ? "font-bold text-gray-900"
                  : "font-medium text-gray-400 hover:text-gray-600"
              }`}
            >
              {item === "해시검색" ? (
                <span className="break-keep">
                  인기 <span className="text-[#2B7FFF]">#</span>태그
                </span>
              ) : (
                <span className="break-keep">{label}</span>
              )}
              {selected ? (
                <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-gray-900" />
              ) : null}
            </button>
          );
        })}
        <a
          href={TEXTBOOK_RANKING_HREF}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleTextbookRankingClick}
          className="relative shrink-0 px-3 py-3 text-sm font-medium whitespace-nowrap text-gray-400 transition hover:text-gray-600 sm:px-4 sm:text-[15px]"
        >
          <span className="break-keep">교재별 랭킹</span>
          <ExternalLink
            className="ml-0.5 inline-block h-3 w-3 -translate-y-1 align-middle"
            aria-hidden
          />
        </a>
      </div>

      {/* 자료 종류·교재 범위 필터 — 화면 숨김 (코드 보존, false로 비활성) */}
      {false && (
        <>
          <div className="flex flex-wrap items-center justify-start gap-2 pl-1.5">
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
            ) : null}

            <button
              type="button"
              onClick={() => setIsDetailOpen((open) => !open)}
              aria-expanded={isDetailOpen}
              aria-controls="textbook-group-filters"
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1 text-sm font-medium transition ${
                isDetailOpen
                  ? "text-gray-900"
                  : "text-gray-700 hover:text-gray-900"
              }`}
            >
              <Filter className="h-3.5 w-3.5" aria-hidden />
              세부 {isDetailOpen ? "▴" : "▾"}
            </button>
          </div>

          {isDetailOpen ? (
            <div
              id="textbook-group-filters"
              role="tablist"
              aria-label="교재 그룹"
              className="flex flex-wrap items-center justify-start gap-2 pl-1.5"
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
              <a
                href={TEXTBOOK_RANKING_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={`${FILTER_AUX_PILL_CLASS} ${FILTER_AUX_PILL_INVERSE_CLASS}`}
              >
                내 교재 랭킹 확인하기 ↗
              </a>
            </div>
          ) : null}
        </>
      )}

      <div className="-mt-2 mb-1 flex items-start justify-between gap-3">
        {categoryDescription ? (
          <p className="break-keep text-xs leading-relaxed text-gray-400 sm:text-[13px]">
            {categoryDescription}
          </p>
        ) : (
          <span />
        )}
        {weekRangeLabel ? (
          <p className="shrink-0 text-[11px] text-gray-400">{weekRangeLabel}</p>
        ) : null}
      </div>

      {isHashtagSearch ? (
        <div className="relative flex w-full items-start gap-8">
          <div className="min-w-0 flex-1">
            <HashtagSearchPanel />
          </div>
          <div className="sticky top-4 hidden shrink-0 lg:block">
            <LiveHashtagPanel variant="sidebar" />
          </div>
        </div>
      ) : (
        <div className="relative flex w-full items-start gap-8">
          <div role="tabpanel" className="min-w-0 flex-1">
            {displayList.length === 0 ? (
              rankings.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-gray-500">
                  표시할 랭킹 데이터가 없습니다.
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
                  <p className="break-keep text-sm font-medium text-gray-600 sm:text-base">
                    앗, 조건에 맞는 브랜드가 없어요
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-full bg-[#FF5520] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    필터 초기화
                  </button>
                </div>
              )
            ) : (
              <ul>
                {displayList.map((item, index) => (
                  <li
                    key={`${item.category}-${item.과목}-${item.UID}-${item.rank}`}
                  >
                    <RankingRow
                      item={item}
                      onOpenIntro={setSelectedAuthor}
                      priority={index < 8}
                      totalClicks={
                        clickCounts[item.UID] ?? item.totalClicks ?? 0
                      }
                      onMaterialsClick={handleMaterialsClick}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sticky top-4 hidden shrink-0 lg:block">
            <LiveHashtagPanel variant="sidebar" />
          </div>
        </div>
      )}

      {textbookConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="textbook-confirm-title"
          onClick={() => setTextbookConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="textbook-confirm-title"
              className="break-keep font-display text-lg font-semibold text-slate-900"
            >
              페이지 이동
            </h3>
            <p className="mt-3 break-keep text-sm leading-relaxed text-slate-600">
              지금 보고 있는 랭킹 페이지를 벗어나 교재 별 자료 랭킹 페이지로
              이동합니다.
            </p>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={dontShowTextbookConfirm}
                onChange={(e) => setDontShowTextbookConfirm(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
              />
              다시보지 않기
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTextbookConfirmOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmTextbookRanking}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
