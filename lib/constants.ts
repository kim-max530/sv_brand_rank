import type {
  RankingCategory,
  SourceRankingCategory,
  Subject,
} from "@/types/ranking";
import {
  CATEGORY_LABELS,
  RANKING_CATEGORIES,
  SUBJECTS,
} from "@/lib/ranking-tabs";

export { CATEGORY_LABELS, RANKING_CATEGORIES, SUBJECTS };
export type { RankingCategory, Subject };

/** Storage에서 fetch하는 원본 랭킹 CSV (발견/인기는 계산으로 생성) */
export const RANKING_FILES = [
  { file: "rank_count.csv", category: "많은", weight: 1 },
  { file: "rank_amount.csv", category: "높은", weight: 1 },
  { file: "rank_growth.csv", category: "급성장", weight: 5 },
  { file: "rank_repurchase.csv", category: "계속 찾는", weight: 10 },
  { file: "rank_search.csv", category: "자꾸 찾는", weight: 2 },
] as const satisfies ReadonlyArray<{
  file: string;
  category: SourceRankingCategory;
  weight: number;
}>;

/** 인기 랭킹에 합산하는 지표 (가중치 없이 순위 합) */
export const POPULAR_RANK_CATEGORIES: readonly SourceRankingCategory[] = [
  "많은",
  "높은",
  "자꾸 찾는",
] as const;

/** 특정 카테고리 랭킹에 없을 때 사용하는 최하위 순위 */
export const MISSING_RANK_FALLBACK = 100;

/** 추천·인기 랭킹 상위 N명 (계산용) */
export const RECOMMEND_TOP_N = 30;

/** 화면 노출 상한: 영어 15위, 국어 10위 */
export const DISPLAY_RANK_LIMIT: Record<Subject, number> = {
  영어: 15,
  국어: 10,
};

/** NEW 뱃지: 과거 없음/15위 초과 → 현재 15위 이내 진입 */
export const NEW_BADGE_RANK_THRESHOLD = 15;

/** 해시태그 목록 페이지당 개수 */
export const HASHTAG_PAGE_SIZE = 10;
