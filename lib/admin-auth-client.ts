"use client";

import Cookies from "js-cookie";
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_AUTH_DAYS,
  ADMIN_AUTH_VALUE,
} from "@/lib/admin-auth";

export function isAdminAuthenticated(): boolean {
  return Cookies.get(ADMIN_AUTH_COOKIE) === ADMIN_AUTH_VALUE;
}

export function setAdminAuthCookie(): void {
  Cookies.set(ADMIN_AUTH_COOKIE, ADMIN_AUTH_VALUE, {
    expires: ADMIN_AUTH_DAYS,
    sameSite: "lax",
    path: "/",
  });
}

export function clearAdminAuthCookie(): void {
  Cookies.remove(ADMIN_AUTH_COOKIE, { path: "/" });
}
