"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  FileText,
  Filter,
  Home,
  Search,
  UserRound,
} from "lucide-react";
import AuthorModal from "@/components/AuthorModal";
import HashtagChips from "@/components/HashtagChips";
import LiveHashtagPanel from "@/components/LiveHashtagPanel";
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
  ) : null;

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 md:flex-row md:items-center md:gap-2">
      {/* 모바일: 순위 아래 변동 / 데스크탑: 변동 | 순위 — 저자명과 동일 라인 높이 */}
      <div className="order-2 flex flex-col items-center justify-center gap-0.5 md:order-1 md:w-10">
        {changeEl}
        {badge ? <StatusBadge badge={badge} /> : null}
      </div>
      <span className="order-1 flex h-[1.5rem] w-7 shrink-0 items-center justify-center text-center font-display text-base font-bold leading-none tabular-nums text-slate-800 sm:h-6 sm:w-8 sm:text-lg md:order-2">
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
  const sizeClass = "h-[52px] w-[52px]";

  if (!src || failed) {
    return (
      <span
        className={`flex ${sizeClass} items-center justify-center rounded-full bg-slate-100 text-slate-400`}
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
      className={`${sizeClass} rounded-full object-cover ring-1 ring-slate-200`}
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

  return (
    <div className="flex w-full items-start gap-2 overflow-hidden border-b border-slate-100 px-3 py-3 sm:gap-2.5 sm:px-5">
      {showRank ? (
        <div className="flex h-6 shrink-0 items-center self-start sm:h-6">
          <RankMeta
            rank={item.rank}
            badge={item.badge ?? null}
            changeText={item.changeText ?? ""}
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 items-start gap-1.5 overflow-hidden pr-1 sm:gap-2">
        {/* 프로필: 고정 높이 + 상단 고정 — 하단 뱃지와 무관하게 Y축 유지 */}
        <div
          className={`relative h-16 w-[52px] shrink-0 ${
            profileClickable
              ? "cursor-pointer transition hover:opacity-90"
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
          <div className="absolute top-0 left-0">
            <ProfileAvatar
              uid={item.UID}
              name={authorName}
              priority={priority}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 overflow-hidden">
          <div
            className={`flex min-w-0 w-full flex-wrap items-center gap-1.5 ${
              profileClickable
                ? "cursor-pointer rounded-lg transition hover:bg-slate-50/80"
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
            <span className="flex h-6 shrink-0 items-center font-bold leading-none text-slate-900 text-sm sm:text-base">
              {authorName}
            </span>
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
          </div>

          {intro ? (
            <p className="relative w-fit max-w-full break-keep rounded-2xl rounded-tl-none bg-gray-100 px-4 py-2 text-[0.7rem] leading-snug text-gray-700 before:absolute before:top-0 before:left-1.5 before:text-xl before:leading-none before:font-black before:text-black before:content-['\201C'] after:absolute after:right-1.5 after:bottom-0 after:text-xl after:leading-none after:font-black after:text-black after:content-['\201D']">
              {intro}
            </p>
          ) : null}

          {/* 대화창 본문(px-4)과 해시태그 시작선 정렬 */}
          <div className="w-full pl-4">
            <HashtagChips record2={item.record2} />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-3 self-start pt-0.5 sm:gap-4">
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

        {address ? (
          <div className="flex flex-row items-start justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={openIntroModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-slate-50 hover:text-gray-900"
                aria-label={`${authorName} 저자 소개 열기`}
              >
                <UserRound className="h-5 w-5" aria-hidden />
              </button>
              <div className="flex h-5 items-center justify-center">
                {showEventBadge ? (
                  <button
                    type="button"
                    onClick={openCoupons}
                    className="inline-flex items-center rounded-full border-none bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase shadow-sm transition hover:brightness-110"
                  >
                    {eventDiscount}% 이벤트
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={handleActionClick}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-slate-50 hover:text-gray-900"
                aria-label={`${authorName} 홈페이지 열기`}
              >
                <Home className="h-5 w-5" aria-hidden />
              </button>
              <span className="text-[11px] font-semibold tabular-nums leading-none text-gray-600">
                {formatClicks(totalClicks)}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleActionClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-slate-50 hover:text-gray-900"
            aria-label={`${authorName} 검색하기`}
          >
            <Search className="h-5 w-5" aria-hidden />
          </button>
        )}
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
    if (!Array.isArray(rankings)) return [];

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

  const selectCategory = (next: RankingCategory) => {
    if (next !== "인기" && next !== "추천") return;
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
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-1 sm:px-0">
      <div
        role="tablist"
        aria-label="과목"
        className="flex flex-wrap justify-start gap-2 pl-1.5"
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
        className="flex flex-wrap justify-center gap-1.5 rounded-xl bg-slate-100/80 p-1.5"
      >
        {RANKING_CATEGORIES.map((item) => {
          const selected = item === category;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectCategory(item)}
              className={`rounded-lg px-3 py-2 text-center text-xs whitespace-nowrap transition sm:text-sm ${
                selected
                  ? "bg-white font-bold text-teal-800 shadow-sm"
                  : "font-medium text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="break-keep">{CATEGORY_LABELS[item]}</span>
            </button>
          );
        })}
        <a
          href={TEXTBOOK_RANKING_HREF}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleTextbookRankingClick}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-center text-xs font-medium whitespace-nowrap text-slate-600 transition hover:text-slate-900 sm:text-sm"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="break-keep">교재 별 랭킹</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
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

      {/* 모바일: 주요 메뉴와 리스트 사이 해시태그 패널 */}
      <LiveHashtagPanel variant="strip" />

      <div className="mx-auto flex w-full max-w-5xl flex-col items-stretch justify-center gap-4 lg:flex-row lg:items-start lg:gap-4">
        <div className="relative mx-auto min-w-0 w-full max-w-3xl lg:mx-0 lg:w-[56%]">
          {(weekRangeLabel || categoryDescription) && (
            <div className="mb-1.5 w-full text-right">
              {weekRangeLabel ? (
                <p className="break-keep text-[0.525rem] leading-snug font-normal text-gray-400/80">
                  {weekRangeLabel}
                </p>
              ) : null}
              {categoryDescription ? (
                <p className="break-keep text-[0.525rem] leading-snug font-normal text-gray-400/80">
                  {categoryDescription}
                </p>
              ) : null}
            </div>
          )}
          <div
            role="tabpanel"
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]"
          >
            {displayList.length === 0 ? (
              rankings.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-slate-500">
                  표시할 랭킹 데이터가 없습니다.
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
                  <p className="break-keep text-sm font-medium text-slate-600 sm:text-base">
                    앗, 조건에 맞는 브랜드가 없어요 🥲
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
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
        </div>

        <LiveHashtagPanel variant="sidebar" />
      </div>

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
