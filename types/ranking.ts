/** brand_info.csv / 랭킹 CSV 헤더에 맞춘 타입 */

export type Subject = "영어" | "국어";

/** 화면 탭: 추천(발견), 인기, 해시검색 / CSV 원본 카테고리도 유지 */
export type RankingCategory =
  | "추천"
  | "인기"
  | "해시검색"
  | "많은"
  | "높은"
  | "급성장"
  | "계속 찾는"
  | "자꾸 찾는";

/** CSV에서 로드하는 원본 지표 카테고리 */
export type SourceRankingCategory = Exclude<
  RankingCategory,
  "추천" | "인기" | "해시검색"
>;

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
  /** brand_info 상품 플래그 */
  변형문제?: boolean;
  워크북?: boolean;
  분석지?: boolean;
}

/** 메인 과목 필터 (전체 포함) */
export type SubjectFilter = "전체" | Subject;

/** 과목별 세부 상품 필터 */
export type ProductFilter =
  | "전체"
  | "변형문제"
  | "워크북"
  | "분석지"
  | "분석";

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
  /** growth CSV에 UID 존재 */
  inGrowth?: boolean;
  /** repurchase CSV에 UID 존재 */
  inRepurchase?: boolean;
  /** search CSV에 UID 존재 */
  inSearch?: boolean;
  /** 인기 랭킹 소속 (해시태그 상세 등) */
  isInPopular?: boolean;
  /** 발견(추천) 랭킹 소속 (해시태그 상세 등) */
  isInRecommend?: boolean;
  /** 해시태그 상세 과목 필터용 (복수 가능) */
  subjects?: Subject[];
}
