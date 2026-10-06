import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const PROMO_BANNER_ID = "default";

export type BannerPlacement =
  | "brand"
  | "recommend"
  | "hashtag_tab"
  | "hashtag_list";

export type PromoBanner = {
  id: string;
  title: string;
  buttonText: string;
  buttonUrl: string;
  showBrand: boolean;
  showRecommend: boolean;
  showHashtagTab: boolean;
  showHashtagList: boolean;
};

export const DEFAULT_PROMO_BANNER: PromoBanner = {
  id: PROMO_BANNER_ID,
  title:
    "중간고사 대비 자료, 더 좋은 자료는 없을지 고민되시나요? 쏠북 가입하고 전문 브랜드를 만나보세요.",
  buttonText: "중간고사 직전 자료 찾기",
  buttonUrl: "https://solvook.com",
  showBrand: true,
  showRecommend: true,
  showHashtagTab: true,
  showHashtagList: true,
};

export const BANNER_PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  brand: "브랜드 랭킹",
  recommend: "추천 랭킹",
  hashtag_tab: "인기 #태그",
  hashtag_list: "태그 목록",
};

function rowToBanner(row: Record<string, unknown> | null): PromoBanner {
  if (!row) return { ...DEFAULT_PROMO_BANNER };
  return {
    id: String(row.id ?? PROMO_BANNER_ID),
    title: String(row.title ?? "").trim() || DEFAULT_PROMO_BANNER.title,
    buttonText:
      String(row.button_text ?? "").trim() || DEFAULT_PROMO_BANNER.buttonText,
    buttonUrl:
      String(row.button_url ?? "").trim() || DEFAULT_PROMO_BANNER.buttonUrl,
    showBrand: Boolean(row.show_brand),
    showRecommend: Boolean(row.show_recommend),
    showHashtagTab: Boolean(row.show_hashtag_tab),
    showHashtagList: Boolean(row.show_hashtag_list),
  };
}

/** 메인/태그 페이지용 — 실패 시 기본 배너 */
export async function fetchPromoBanner(): Promise<PromoBanner> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("promo_banners")
      .select(
        "id, title, button_text, button_url, show_brand, show_recommend, show_hashtag_tab, show_hashtag_list",
      )
      .eq("id", PROMO_BANNER_ID)
      .maybeSingle();

    if (error) {
      console.warn("[promo_banners]", error.message);
      return { ...DEFAULT_PROMO_BANNER };
    }
    return rowToBanner(data as Record<string, unknown> | null);
  } catch (error) {
    console.warn("[promo_banners]", error);
    return { ...DEFAULT_PROMO_BANNER };
  }
}

export function bannerVisibleForPlacement(
  banner: PromoBanner,
  placement: BannerPlacement,
): boolean {
  if (!banner.title.trim() && !banner.buttonText.trim()) return false;
  switch (placement) {
    case "brand":
      return banner.showBrand;
    case "recommend":
      return banner.showRecommend;
    case "hashtag_tab":
      return banner.showHashtagTab;
    case "hashtag_list":
      return banner.showHashtagList;
    default:
      return false;
  }
}

export async function upsertPromoBanner(input: {
  title: string;
  buttonText: string;
  buttonUrl: string;
  showBrand: boolean;
  showRecommend: boolean;
  showHashtagTab: boolean;
  showHashtagList: boolean;
}): Promise<PromoBanner> {
  const supabase = getSupabaseAdminClient();
  const payload = {
    id: PROMO_BANNER_ID,
    title: input.title.trim(),
    button_text: input.buttonText.trim(),
    button_url: input.buttonUrl.trim(),
    show_brand: input.showBrand,
    show_recommend: input.showRecommend,
    show_hashtag_tab: input.showHashtagTab,
    show_hashtag_list: input.showHashtagList,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("promo_banners")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, title, button_text, button_url, show_brand, show_recommend, show_hashtag_tab, show_hashtag_list",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowToBanner(data as Record<string, unknown>);
}
