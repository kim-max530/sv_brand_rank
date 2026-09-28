"use client";

export type AnalyticsEventType =
  | "page_view"
  | "tab_click"
  | "profile_click"
  | "homepage_click"
  | "hashtag_click";

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
      const payload: { event_type: string; target_name?: string } = {
        event_type: eventType,
      };
      const trimmed = targetName?.trim();
      if (trimmed) payload.target_name = trimmed;

      const body = JSON.stringify(payload);

      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
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
