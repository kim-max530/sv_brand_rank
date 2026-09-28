import type { RankingCategory, Subject } from "@/types/ranking";

/** 클라이언트 UI(탭)에서만 쓰는 상수 — 서버 전용 모듈과 분리 */
export const SUBJECTS: Subject[] = ["영어", "국어"];

/** 화면에 노출하는 탭: 인기, 발견 */
export const RANKING_CATEGORIES: RankingCategory[] = ["인기", "추천"];

export const CATEGORY_LABELS: Record<RankingCategory, string> = {
  추천: "✨ 발견",
  인기: "🔥 인기",
  급성장: "🚀 급성장",
  많은: "🤝 검색",
  "계속 찾는": "💖 재구매",
  높은: "💎 프리미엄",
  "자꾸 찾는": "🔥 인기",
};

/** 탭 선택 시 리스트 위에 보여줄 설명 */
export const CATEGORY_DESCRIPTIONS: Partial<Record<RankingCategory, string>> = {
  추천: "고객 피드백, 다양한 판매 지수 등으로 재구성한 쏠북 추천 지수 상위 저자",
  인기:
    "브랜드관이 있는 저자 중 판매·금액·검색 지표를 합산한 상위 저자",
};
