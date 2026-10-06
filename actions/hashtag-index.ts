"use server";

import { warmHashtagAuthorIndex } from "@/lib/hashtag-index";

/** 홈 진입 후 백그라운드에서 태그별 저자 인덱스를 미리 준비한다. */
export async function warmHashtagIndexAction(): Promise<void> {
  try {
    await warmHashtagAuthorIndex();
  } catch (error) {
    console.warn("[hashtag-index] background warm failed", error);
  }
}
