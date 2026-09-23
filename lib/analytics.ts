"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type AnalyticsEventType =
  | "page_view"
  | "tab_click"
  | "profile_click"
  | "homepage_click";

/** 트래킹 실패가 UI를 막지 않도록 fire-and-forget */
export function trackAnalyticsEvent(
  eventType: AnalyticsEventType,
  targetName?: string,
): void {
  void (async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const payload: { event_type: string; target_name?: string } = {
        event_type: eventType,
      };
      const trimmed = targetName?.trim();
      if (trimmed) payload.target_name = trimmed;

      const { error } = await supabase.from("analytics_events").insert(payload);
      if (error) {
        console.warn("[analytics]", error.message);
      }
    } catch (error) {
      console.warn("[analytics]", error);
    }
  })();
}
