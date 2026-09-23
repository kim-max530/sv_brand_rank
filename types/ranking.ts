/** brand_info.csv / 랭킹 CSV 헤더에 맞춘 타입 */

export type Subject = "영어" | "국어";

export type RankingCategory =
  | "추천"
  | "많은"
  | "높은"
  | "급성장"
  | "계속 찾는"
  | "자꾸 찾는";

export type RankBadge = "NEW" | "HOT" | null;

export interface BrandInfo {
  UID: string;
  저자명: string;
  address?: string;
  info1?: string;
  info2?: string;
  intro?: string;
  record?: string;
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
}
