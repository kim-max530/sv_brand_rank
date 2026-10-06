"use server";

import { requireAdminSession } from "@/lib/admin-auth-server";
import {
  fetchPromoBanner,
  upsertPromoBanner,
  type PromoBanner,
} from "@/lib/promo-banner";
import { revalidatePath } from "next/cache";

export type PromoBannerActionResult =
  | { ok: true; message: string; banner?: PromoBanner }
  | { ok: false; error: string };

async function requireAdmin(): Promise<{ ok: false; error: string } | null> {
  if (await requireAdminSession()) return null;
  return { ok: false, error: "관리자 로그인이 필요합니다." };
}

export async function fetchPromoBannerAction(): Promise<PromoBannerActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const banner = await fetchPromoBanner();
    return { ok: true, message: "ok", banner };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "배너 설정을 불러오지 못했습니다.",
    };
  }
}

export async function savePromoBannerAction(
  formData: FormData,
): Promise<PromoBannerActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const title = String(formData.get("title") ?? "");
    const buttonText = String(formData.get("button_text") ?? "");
    const buttonUrl = String(formData.get("button_url") ?? "");
    const showBrand = formData.get("show_brand") === "on";
    const showRecommend = formData.get("show_recommend") === "on";
    const showHashtagTab = formData.get("show_hashtag_tab") === "on";
    const showHashtagList = formData.get("show_hashtag_list") === "on";

    if (!title.trim()) {
      return { ok: false, error: "제목을 입력해 주세요." };
    }
    if (!buttonText.trim()) {
      return { ok: false, error: "버튼 텍스트를 입력해 주세요." };
    }
    if (!buttonUrl.trim()) {
      return { ok: false, error: "버튼 링크 URL을 입력해 주세요." };
    }
    if (
      !showBrand &&
      !showRecommend &&
      !showHashtagTab &&
      !showHashtagList
    ) {
      return {
        ok: false,
        error: "노출 위치를 하나 이상 선택해 주세요.",
      };
    }

    const banner = await upsertPromoBanner({
      title,
      buttonText,
      buttonUrl,
      showBrand,
      showRecommend,
      showHashtagTab,
      showHashtagList,
    });

    revalidatePath("/");
    revalidatePath("/hashtag", "layout");

    return { ok: true, message: "배너 설정이 저장되었습니다.", banner };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "배너 저장에 실패했습니다. promo_banners 테이블을 확인해 주세요.",
    };
  }
}
