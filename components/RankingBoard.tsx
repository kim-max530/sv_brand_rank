"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Filter, Search, UserRound } from "lucide-react";
import AuthorModal from "@/components/AuthorModal";
import Banner from "@/components/Banner";
import HashtagSearchPanel, {
  type HashtagSearchReadyData,
} from "@/components/HashtagSearchPanel";
import LiveHashtagPanel from "@/components/LiveHashtagPanel";
import TagBadge, { HashtagMark } from "@/components/TagBadge";
import { fetchHashtagSearchData } from "@/actions/analytics";
import { warmHashtagIndexAction } from "@/actions/hashtag-index";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  cacheAvatarSrc,
  getCachedAvatarSrc,
  getProfileImageCandidates,
  initialCandidateIndex,
} from "@/lib/brand-images";
import { DISPLAY_RANK_LIMIT } from "@/lib/constants";
import { bumpAuthorClicks } from "@/lib/author-stats-client";
import { parseHashtags } from "@/lib/hashtags";
import {
  bannerVisibleForPlacement,
  type BannerPlacement,
  type PromoBanner,
} from "@/lib/promo-banner";
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

function placementForCategory(category: RankingCategory): BannerPlacement | null {
  if (category === "인기") return "brand";
  if (category === "추천") return "recommend";
  if (category === "해시검색") return "hashtag_tab";
  return null;
}

function safeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function StoreHeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3.5 8.5 12 2l8.5 6.5v10.25A2.25 2.25 0 0 1 18.25 21H5.75a2.25 2.25 0 0 1-2.25-2.25V8.5Z" />
      <path d="M12 17.1c-2.8-1.65-4.2-2.95-4.2-4.65A2.35 2.35 0 0 1 12 11a2.35 2.35 0 0 1 4.2 1.45c0 1.7-1.4 3-4.2 4.65Z" />
    </svg>
  );
}

function tabTargetName(category: RankingCategory): string {
  return (CATEGORY_LABELS[category] ?? String(category))
    .replace(/^\S+\s+/, "")
    .trim();
}

/** 순위·변동·아바타 열 고정폭 — 리스트 X축 정렬 기준 */
const RANK_COL =
  "w-8 flex-shrink-0 text-center text-lg font-bold text-[#1A1E27]";
const CHANGE_COL =
  "flex w-14 flex-shrink-0 items-center justify-center font-bold";

function StatusBadge({ badge }: { badge: RankBadge }) {
  if (badge === "NEW") {
    return (
      <span className="inline-flex items-center text-lg font-bold leading-none text-[#FF9500]">
        New
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
  const compactChange = rawChange.replace(/\s+/g, "");
  const showChange = Boolean(rawChange) && badge !== "NEW";
  const isUnchanged = rawChange === "-";

  let changeInner: ReactNode;
  if (badge === "NEW") {
    changeInner = <StatusBadge badge={badge} />;
  } else if (showChange) {
    const colorClass = isUnchanged
      ? "text-[#9E9E9E]"
      : rawChange.startsWith("▲")
        ? "text-[#FF3B30]"
        : rawChange.startsWith("▼")
          ? "text-[#2B7FFF]"
          : "text-[#9E9E9E]";
    const triangle = rawChange.startsWith("▲")
      ? "▲"
      : rawChange.startsWith("▼")
        ? "▼"
        : "";
    const deltaNum = compactChange.replace(/[▲▼]/g, "");
    changeInner = isUnchanged ? (
      <div className="mx-auto h-[2px] w-4 rounded-full bg-[#9E9E9E]" />
    ) : (
      <span
        className={`flex items-center gap-0.5 font-bold leading-none tabular-nums ${colorClass}`}
      >
        {triangle ? (
          <span className="text-xl leading-none">{triangle}</span>
        ) : null}
        <span className="text-lg leading-none">{deltaNum}</span>
      </span>
    );
  } else {
    changeInner = (
      <div className="mx-auto h-[2px] w-4 rounded-full bg-[#9E9E9E]" />
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 lg:flex-row lg:items-center lg:gap-1">
      <div className={RANK_COL}>{safeRank || "-"}</div>
      <div className={CHANGE_COL}>{changeInner}</div>
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
        className="flex h-full w-full items-center justify-center bg-pink-50 text-slate-400"
        aria-hidden
      >
        <UserRound className="h-6 w-6" strokeWidth={1.5} />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={name || "저자"}
      width={96}
      height={96}
      sizes="96px"
      quality={60}
      className="h-full w-full object-cover"
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
  const tags = parseHashtags(item.record2);
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
  const isHashtagLayout = layout === "hashtag" || !showRank;
  /** address 없음 → 검색 아이콘만 (사람 아이콘 숨김) */
  const showUserIcon = Boolean(address);
  void range3;
  void medals;
  void totalClicks;

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
    <div
      className={`flex w-full items-start gap-3 border-b border-[#E5E7EB] py-4 md:items-center md:gap-6 lg:py-[14px] ${
        isHashtagLayout ? "pl-4 md:pl-10" : ""
      }`}
    >
      {/* 좌측: 순위 + 등락 + 이미지 */}
      <div className="flex shrink-0 items-center gap-2">
        {showRank ? (
          <RankMeta
            rank={item.rank}
            badge={item.badge ?? null}
            changeText={item.changeText ?? ""}
          />
        ) : null}

        <div
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-pink-200 transition-opacity hover:cursor-pointer hover:opacity-80 md:h-24 md:w-24"
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
      </div>

      {/* 중앙: 저자명(+모바일 프로필) → 해시태그(w-full) → 대화창(md+) */}
      <div className="flex min-w-0 w-full flex-1 flex-col justify-center text-left">
        <div className="flex items-center gap-2">
          <h3
            className="truncate text-[18px] font-bold text-[#1A1E27] transition-opacity hover:cursor-pointer hover:opacity-80"
            onClick={profileClickable ? openProfile : openIntroModal}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (profileClickable) openProfile();
                else openIntroModal();
              }
            }}
            role="button"
            tabIndex={0}
          >
            {authorName}
          </h3>
          {showUserIcon ? (
            <button
              type="button"
              onClick={openIntroModal}
              className="flex items-center justify-center text-[#717680] transition-opacity hover:cursor-pointer hover:opacity-80 md:hidden"
              aria-label={`${authorName} 저자 소개 열기`}
            >
              <UserRound
                className="h-5 w-5 fill-none stroke-[#717680]"
                strokeWidth={1.5}
                aria-hidden
              />
            </button>
          ) : null}
        </div>

        {tags.length > 0 ? (
          <div className="mt-1.5 flex w-full flex-wrap gap-1.5">
            {tags.map((tag, idx) => (
              <TagBadge key={`${tag}-${idx}`} tag={tag} />
            ))}
          </div>
        ) : null}

        {intro ? (
          <div className="mt-1.5 mr-12 hidden w-full rounded-lg bg-[#F0F2F5] py-1 pl-1.5 pr-3.5 md:block">
            <p className="truncate text-[15px] text-[#4A4E58]">{intro}</p>
          </div>
        ) : null}
      </div>

      {/* 우측: 데스크탑 프로필 + 홈/검색 */}
      <div className="ml-auto flex w-auto flex-shrink-0 flex-col items-center justify-center gap-1 self-center md:w-20 md:pl-12">
        <div className="flex items-center gap-3 md:gap-6">
          {showUserIcon ? (
            <button
              type="button"
              onClick={openIntroModal}
              className="hidden items-center justify-center text-[#717680] transition-opacity hover:cursor-pointer hover:opacity-80 md:flex"
              aria-label={`${authorName} 저자 소개 열기`}
            >
              <UserRound
                className="h-6 w-6 fill-none stroke-[#717680]"
                strokeWidth={1.5}
                aria-hidden
              />
            </button>
          ) : (
            <div className="hidden h-6 w-6 md:block" />
          )}
          <button
            type="button"
            onClick={handleActionClick}
            className="flex items-center justify-center text-[#717680] transition-opacity hover:cursor-pointer hover:opacity-80"
            aria-label={
              address
                ? `${authorName} 홈페이지 열기`
                : `${authorName} 검색하기`
            }
          >
            {address ? (
              <StoreHeartIcon className="h-6 w-6 fill-none stroke-[#717680]" />
            ) : (
              <Search className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            )}
          </button>
        </div>
        {showEventBadge ? (
          <button
            type="button"
            onClick={openCoupons}
            className="rounded bg-purple-100 px-1 text-[10px] font-bold text-purple-600 transition-opacity hover:cursor-pointer hover:opacity-80"
          >
            {eventDiscount}% Event
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface RankingBoardProps {
  rankings: MergedRanking[];
  weekRangeLabel: string;
  promoBanner: PromoBanner;
}

export default function RankingBoard({
  rankings,
  weekRangeLabel,
  promoBanner,
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
    "인기",
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
  /** 태그 탭 즉시 전환용 — 페이지 로드 시 사전 fetch */
  const [hashtagPrefetch, setHashtagPrefetch] =
    useState<HashtagSearchReadyData | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchHashtagSearchData();
        if (cancelled || !result.ok) return;
        setHashtagPrefetch({
          topTags: result.data.topTags,
          recentTags: result.data.recentTags,
        });
      } catch {
        // 패널 자체 재시도에 맡김
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 태그별 저자 사전 분류 + 인원 수 (탭/패널 즉시 렌더용) */
  const authorsByTag = useMemo(() => {
    const byTag = new Map<string, MergedRanking[]>();
    const seenUidByTag = new Map<string, Set<string>>();
    for (const item of rankings) {
      const uid = item.UID;
      if (!uid) continue;
      for (const tag of parseHashtags(item.record2)) {
        const key = tag.toLowerCase();
        let set = seenUidByTag.get(key);
        if (!set) {
          set = new Set();
          seenUidByTag.set(key, set);
        }
        if (set.has(uid)) continue;
        set.add(uid);
        const list = byTag.get(key) ?? [];
        list.push(item);
        byTag.set(key, list);
      }
    }
    return byTag;
  }, [rankings]);

  const tagAuthorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [tag, list] of authorsByTag) {
      counts.set(tag, list.length);
    }
    return counts;
  }, [authorsByTag]);

  const effectiveSubject = useMemo<Subject>(() => {
    if (category === "해시검색") return subject;

    const hasRows = (candidate: Subject) =>
      rankings.some(
        (item) =>
          item?.과목 === candidate &&
          Number.isFinite(item.rank) &&
          item.rank >= 1 &&
          (item.category === category ||
            (category === "인기" && Boolean(safeText(item.address)))),
      );

    if (hasRows(subject)) return subject;
    return SUBJECTS.find(hasRows) ?? subject;
  }, [rankings, category, subject]);

  const productOptions = productFiltersForSubject(effectiveSubject);

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
    void warmHashtagIndexAction();
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
    const direct = rankings
      .filter((item) => {
        if (!item || item.category !== category) return false;
        if (item.과목 !== effectiveSubject) return false;
        if (!Number.isFinite(item.rank) || item.rank < 1) return false;
        if (!matchesProductFilter(item, product)) return false;
        return matchesTextbookGroupFilter(item, textbookGroup);
      })
      .sort(
        (a, b) =>
          a.rank - b.rank || a.저자명.localeCompare(b.저자명, "ko"),
      );

    if (direct.length > 0 || category !== "인기") return direct;

    // 배포 데이터에서 계산된 인기 카테고리가 누락되어도 브랜드관 저자는 노출한다.
    const recommended = rankings.filter(
      (item) =>
        item?.category === "추천" &&
        item.과목 === effectiveSubject &&
        Boolean(safeText(item.address)) &&
        Number.isFinite(item.rank) &&
        item.rank >= 1 &&
        matchesProductFilter(item, product) &&
        matchesTextbookGroupFilter(item, textbookGroup),
    );
    const pool =
      recommended.length > 0
        ? recommended
        : rankings.filter(
            (item) =>
              item?.과목 === effectiveSubject &&
              Boolean(safeText(item.address)) &&
              Number.isFinite(item.rank) &&
              item.rank >= 1 &&
              matchesProductFilter(item, product) &&
              matchesTextbookGroupFilter(item, textbookGroup),
          );

    const unique = new Map<string, MergedRanking>();
    for (const item of [...pool].sort((a, b) => a.rank - b.rank)) {
      if (!unique.has(item.UID)) unique.set(item.UID, item);
    }
    return [...unique.values()].map((item, index) => ({
      ...item,
      category: "인기" as const,
      rank: index + 1,
      badge: null,
      changeText: "-",
    }));
  }, [
    rankings,
    effectiveSubject,
    product,
    textbookGroup,
    category,
  ]);

  /** 화면 렌더링만 영어 15 / 국어 10으로 제한 */
  const displayList = useMemo(() => {
    const limit = DISPLAY_RANK_LIMIT[effectiveSubject] ?? 15;
    return list.slice(0, limit);
  }, [list, effectiveSubject]);

  const categoryDescription = CATEGORY_DESCRIPTIONS[category];
  const isHashtagSearch = category === "해시검색";
  const bannerPlacement = placementForCategory(category);
  const showPromoBanner =
    bannerPlacement != null &&
    bannerVisibleForPlacement(promoBanner, bannerPlacement);

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
    <section className="mx-auto flex w-full max-w-5xl flex-col px-0">
      <div
        role="tablist"
        aria-label="과목"
        className="mx-auto mb-3 mt-0 inline-flex items-center rounded-full border border-gray-100 bg-white p-1 shadow-md"
      >
        {SUBJECTS.map((item) => {
          const selected = item === effectiveSubject;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectSubject(item)}
              className={`rounded-full px-6 py-2 text-lg transition ${
                selected
                  ? item === "국어"
                    ? "bg-[#FFCC00] font-bold text-black shadow-sm"
                    : "bg-[#FF5520] font-bold text-white shadow-sm"
                  : "bg-transparent font-medium text-[#9E9E9E]"
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
        className="mt-5 flex w-full items-center justify-center gap-3 overflow-x-auto border-b border-gray-200 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-8 [&::-webkit-scrollbar]:hidden"
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
              className={`relative shrink-0 cursor-pointer whitespace-nowrap px-2 pb-2 text-sm transition md:px-4 md:pb-3 md:text-base lg:text-lg ${
                selected
                  ? "-mb-px border-b-4 border-[#1A1E27] font-bold text-[#1A1E27]"
                  : "font-medium text-[#9E9E9E] hover:text-[#4F566D]"
              }`}
            >
              {item === "해시검색" ? (
                <span
                  className={`flex items-center gap-1 ${
                    selected
                      ? "font-bold text-[#1A1E27]"
                      : "font-medium text-[#9E9E9E]"
                  }`}
                >
                  인기 <HashtagMark text="태그" />
                </span>
              ) : (
                <span className="break-keep">{label}</span>
              )}
            </button>
          );
        })}
        <a
          href={TEXTBOOK_RANKING_HREF}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleTextbookRankingClick}
          className="relative inline-flex shrink-0 items-center whitespace-nowrap pb-2 text-sm font-medium text-[#9E9E9E] transition hover:text-[#4F566D] md:text-base lg:text-lg"
        >
          <span className="flex items-center gap-1">
            교재별 랭킹 <ExternalLink className="w-4 h-4 text-[#717680]" />
          </span>
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

      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-white pb-10">
        <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 sm:pt-4">
          <div className="relative mb-4 w-full">
            {categoryDescription ? (
              <div className="mb-4 flex w-full flex-col items-center justify-center leading-tight">
                <p className="text-center text-xs text-[#8E939F]">
                  {categoryDescription}
                </p>
                {!isHashtagSearch && weekRangeLabel ? (
                  <p className="mt-0.5 text-center text-xs text-[#8E939F]">
                    {weekRangeLabel}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="relative flex w-full items-start gap-8 pr-4 md:gap-16 lg:pr-32">
        <div role="tabpanel" className="min-w-0 flex-1 bg-white">
          {/* 태그 탭도 항상 마운트 — 전환 시 재fetch 지연 방지 */}
          <div className={isHashtagSearch ? "block" : "hidden"} aria-hidden={!isHashtagSearch}>
            <HashtagSearchPanel initialData={hashtagPrefetch} />
          </div>
          <div className={isHashtagSearch ? "hidden" : "block"} aria-hidden={isHashtagSearch}>
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
        </div>

            <div className="sticky top-4 hidden shrink-0 lg:block">
              <LiveHashtagPanel
                variant="sidebar"
                authorCountByTag={tagAuthorCounts}
              />
            </div>
          </div>
        </div>
      </div>

      {showPromoBanner ? (
        <Banner
          title={promoBanner.title}
          buttonText={promoBanner.buttonText}
          buttonUrl={promoBanner.buttonUrl}
        />
      ) : null}

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
