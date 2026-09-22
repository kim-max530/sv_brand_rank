"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateHomePage(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    // CSV fetch 캐시 + 홈 페이지 캐시 즉시 무효화
    revalidateTag("ranking-data", { expire: 0 });
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "캐시 초기화에 실패했습니다.";
    return { ok: false, error: message };
  }
}
