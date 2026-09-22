import type { RankingCategory, Subject } from "@/types/ranking";

/** 클라이언트 UI(탭)에서만 쓰는 상수 — 서버 전용 모듈과 분리 */
export const SUBJECTS: Subject[] = ["영어", "국어"];

export const RANKING_CATEGORIES: RankingCategory[] = [
  "추천",
  "자꾸 찾는",
  "급성장",
  "많은",
  "계속 찾는",
  "높은",
];

export const CATEGORY_LABELS: Record<RankingCategory, string> = {
  추천: "✨ 발견",
  "자꾸 찾는": "🔥 인기",
  급성장: "🚀 급성장",
  많은: "🤝 검색",
  "계속 찾는": "💖 재구매",
  높은: "💎 프리미엄",
};

/** 탭 선택 시 리스트 위에 보여줄 설명 */
export const CATEGORY_DESCRIPTIONS: Record<RankingCategory, string> = {
  추천: "고객 피드백, 다양한 판매 지수 등으로 재구성한 쏠북 추천 지수 상위 저자",
  "자꾸 찾는": "기간 중 가장 많은 자료를 판매한 저자",
  급성장: "이전 집계 기간과 비교하여 판매량이 급상승한 저자",
  많은: "쏠북 내 고객들이 가장 많이 검색해본 저자",
  "계속 찾는": "고객들이 계속해서 반복 구매하는 단골이 많은 저자",
  높은: "기간 중 가장 높은 판매 규모를 기록한 저자",
};
