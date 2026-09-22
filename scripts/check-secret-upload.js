const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  process.env[m[1].trim()] = v;
}

const url = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).replace(/\/$/, "");
const secret =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

console.log("url:", Boolean(url));
console.log("secret loaded:", Boolean(secret), "len:", secret.length, "prefix:", secret.slice(0, 12));

if (!url || !secret) {
  process.exit(1);
}

const sb = createClient(url, secret, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

(async () => {
  const dl = await sb.storage.from("weekly_ranking").download("rank_growth.csv");
  if (dl.error) {
    console.log("download rank_growth:", dl.error.message);
  } else {
    console.log("download rank_growth: ok");
    const backup = await sb.storage
      .from("weekly_ranking")
      .upload("prev_rank_growth.csv", dl.data, {
        upsert: true,
        contentType: "text/csv",
      });
    console.log("backup prev_rank_growth:", backup.error?.message || "ok");
  }
})();
