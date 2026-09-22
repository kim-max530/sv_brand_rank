import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/** 서버 전용. RLS를 우회하는 secret / service_role 클라이언트 */
export function getSupabaseAdminClient(): SupabaseClient {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!url || !secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY(또는 SUPABASE_SERVICE_ROLE_KEY) 환경변수가 필요합니다. Supabase → API Keys → Secret key를 .env.local에 넣어 주세요.",
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClient;
}
