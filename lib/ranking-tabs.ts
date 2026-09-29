import type {
  ProductFilter,
  RankingCategory,
  Subject,
  SubjectFilter,
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

/** URL ?tab= 값 */
export type RankingTabParam = "brand" | "recommend" | "search";

/** 화면에 노출하는 탭: 브랜드 랭킹, 추천 랭킹, 실시간 검색 */
export const RANKING_CATEGORIES: RankingCategory[] = [
  "인기",
  "추천",
  "해시검색",
];

export const CATEGORY_LABELS: Record<RankingCategory, string> = {
  추천: "✨ 추천 랭킹",
  인기: "🔥 브랜드 랭킹",
  해시검색: "🔍 실시간 검색",
  급성장: "🚀 급성장",
  많은: "🤝 검색",
  "계속 찾는": "💖 재구매",
  높은: "💎 프리미엄",
  "자꾸 찾는": "🔥 인기",
};

/** 탭 선택 시 리스트 위에 보여줄 설명 */
export const CATEGORY_DESCRIPTIONS: Partial<Record<RankingCategory, string>> = {
  추천: "고객 피드백, 다양한 판매 지수 등으로 재구성한 쏠북 추천 지수 상위 저자",
  인기: "브랜드관이 있는 저자 중 판매·금액·검색 지표를 합산한 상위 저자",
  해시검색: "최근 7일간 가장 많이 클릭된 해시태그",
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
