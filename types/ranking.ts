/** brand_info.csv / 랭킹 CSV 헤더에 맞춘 타입 */

export type Subject = "영어" | "국어";

/** 화면 탭: 추천(발견), 인기 / CSV 원본 카테고리도 유지 */
export type RankingCategory =
  | "추천"
  | "인기"
  | "많은"
  | "높은"
  | "급성장"
  | "계속 찾는"
  | "자꾸 찾는";

/** CSV에서 로드하는 원본 지표 카테고리 */
export type SourceRankingCategory = Exclude<RankingCategory, "추천" | "인기">;

/** 순위 변동 뱃지 — HOT(상승폭)은 제거, NEW만 사용 */
export type RankBadge = "NEW" | null;

export interface BrandInfo {
  UID: string;
  저자명: string;
  address?: string;
  info1?: string;
  info2?: string;
  intro?: string;
  record?: string;
  record2?: string;
  range3?: string;
  youtube_url?: string;
}

export interface RankingRecord {
  UID: string;
  과목: Subject;
  rank: number;
}

export interface MergedRanking extends BrandInfo, RankingRecord {
  category: RankingCategory;
  badge: RankBadge;
  changeText: string;
  /** author_events 기간 내 활성 여부 */
  hasEvent?: boolean;
  /** growth CSV 1~5위 */
  isTopGrowth?: boolean;
  /** repurchase CSV 1~5위 */
  isTopRepurchase?: boolean;
}
