import type {
  ProductFilter,
  RankingCategory,
  Subject,
  SubjectFilter,
  TextbookGroupFilter,
} from "@/types/ranking";

/** 클라이언트 UI(탭)에서만 쓰는 상수 — 서버 전용 모듈과 분리 */
export const SUBJECTS: Subject[] = ["영어", "국어"];

/** 메인 과목 필터 (영어/국어) */
export const SUBJECT_FILTERS: SubjectFilter[] = ["영어", "국어"];

/** 영어 세부 필터 */
export const ENGLISH_PRODUCT_FILTERS: ProductFilter[] = [
  "전체",
  "변형문제",
  "워크북",
  "분석지",
];

/** 국어 세부 필터 (분석 = 분석지 열) */
export const KOREAN_PRODUCT_FILTERS: ProductFilter[] = [
  "전체",
  "변형문제",
  "분석",
];

export function productFiltersForSubject(
  subject: SubjectFilter,
): ProductFilter[] {
  if (subject === "영어") return ENGLISH_PRODUCT_FILTERS;
  if (subject === "국어") return KOREAN_PRODUCT_FILTERS;
  return [];
}

/** 교재 그룹 필터 */
export const TEXTBOOK_GROUP_FILTERS: TextbookGroupFilter[] = [
  "전체",
  "교과서",
  "EBS",
  "부교재",
  "모의고사",
];

/** 과목 토글 (시안: 주황 active) */
export const FILTER_PILL_CLASS =
  "rounded-full px-5 py-2 text-sm font-semibold transition";

export const FILTER_PILL_SELECTED_CLASS = "bg-[#FF5520] text-white";
export const FILTER_PILL_IDLE_CLASS = "bg-gray-100 text-gray-600 hover:bg-gray-200";

/** 세부 토글·외부 링크 등 보조 pill */
export const FILTER_AUX_PILL_CLASS =
  "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold transition";

export const FILTER_AUX_PILL_INVERSE_CLASS =
  "bg-slate-800 text-white hover:bg-slate-700";

/** URL ?tab= 값 */
export type RankingTabParam = "brand" | "recommend" | "search";

/** 화면에 노출하는 탭 */
export const RANKING_CATEGORIES: RankingCategory[] = [
  "인기",
  "추천",
  "해시검색",
];

export const CATEGORY_LABELS: Record<RankingCategory, string> = {
  추천: "추천 랭킹",
  인기: "브랜드 랭킹",
  해시검색: "인기 #태그",
  급성장: "급성장",
  많은: "검색",
  "계속 찾는": "재구매",
  높은: "프리미엄",
  "자꾸 찾는": "인기",
};

/** 교재 별 랭킹 바로가기 */
export const TEXTBOOK_RANKING_HREF =
  "https://solvook.com/#:~:text=%EC%84%A0%ED%83%9D%ED%95%9C%20%EA%B5%90%EC%9E%AC%EC%9D%98%20%EC%9E%90%EB%A3%8C%EB%A5%BC%20%EB%B3%B4%EC%97%AC%EB%93%9C%EB%A0%A4%EC%9A%94";

export const COUPONS_HREF = "https://solvook.com/coupons";

/** 탭 선택 시 리스트 위 안내문 (시안 카피) */
export const CATEGORY_DESCRIPTIONS: Partial<Record<RankingCategory, string>> = {
  추천:
    "고객 피드백과 판매 지표를 바탕으로 쏠북이 추천하는 브랜드를 보여드려요.",
  인기: "집계 기간 중 쏠북 마켓에서 가장 많이 검색된 브랜드를 보여드려요.",
  해시검색: "최근 많이 클릭된 인기 #태그를 보여드려요.",
};

export const CATEGORY_TO_TAB: Record<
  "인기" | "추천" | "해시검색",
  RankingTabParam
> = {
  인기: "brand",
  추천: "recommend",
  해시검색: "search",
};

export function categoryFromTabParam(
  raw: string | null | undefined,
): RankingCategory | null {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "search" || value === "해시검색" || value === "hashtag") {
    return "해시검색";
  }
  if (value === "recommend" || value === "추천" || value === "발견") {
    return "추천";
  }
  if (value === "brand" || value === "인기" || value === "popular") {
    return "인기";
  }
  return null;
}

export function homeHrefWithTab(category: RankingCategory): string {
  if (category === "해시검색") return "/?tab=search";
  if (category === "추천") return "/?tab=recommend";
  if (category === "인기") return "/?tab=brand";
  return "/";
}
