import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, ADMIN_AUTH_VALUE } from "@/lib/admin-auth";

/** 서버 액션용 관리자 세션 확인 (브라우저 쿠키) */
export async function requireAdminSession(): Promise<boolean> {
  try {
    const jar = await cookies();
    return jar.get(ADMIN_AUTH_COOKIE)?.value === ADMIN_AUTH_VALUE;
  } catch {
    return false;
  }
}
