"use client";

export type AnalyticsEventType =
  | "page_view"
  | "tab_click"
  | "profile_click"
  | "homepage_click"
  | "hashtag_click"
  | "banner_click";

const VISITOR_KEY = "solvook_visitor_id";

/** 로컬스토리지 기반 방문자 UUID (없으면 발급) */
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY)?.trim();
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return "";
  }
}

/**
 * 브라우저 anon 키는 RLS에 막히므로 서버 API(secret)로 Insert.
 * keepalive로 페이지 이동(해시태그 Link) 중에도 요청이 끊기지 않게 함.
 */
export function trackAnalyticsEvent(
  eventType: AnalyticsEventType,
  targetName?: string,
): void {
  void (async () => {
    try {
      const payload: {
        event_type: string;
        target_name?: string;
        visitor_id?: string;
      } = {
        event_type: eventType,
      };
      const trimmed = targetName?.trim();
      if (trimmed) payload.target_name = trimmed;
      const visitorId = getOrCreateVisitorId();
      if (visitorId) payload.visitor_id = visitorId;

      const body = JSON.stringify(payload);

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const ok = navigator.sendBeacon(
          "/api/analytics",
          new Blob([body], { type: "application/json" }),
        );
        if (ok) return;
      }

      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    } catch (error) {
      console.warn("[analytics]", error);
    }
  })();
}
