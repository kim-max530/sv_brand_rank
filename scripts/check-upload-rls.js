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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  const blob = new Blob(["test"], { type: "text/csv" });

  const upNew = await sb.storage
    .from("weekly_ranking")
    .upload(`prev_rank_growth.csv`, blob, {
      upsert: true,
      contentType: "text/csv",
    });
  console.log("upload new/upsert prev:", upNew.error?.message || "ok");

  const upExist = await sb.storage
    .from("weekly_ranking")
    .upload(`rank_growth.csv`, blob, {
      upsert: true,
      contentType: "text/csv",
    });
  console.log("upload upsert existing rank:", upExist.error?.message || "ok");

  const copy = await sb.storage
    .from("weekly_ranking")
    .copy("rank_growth.csv", "prev_rank_growth.csv");
  console.log("copy:", copy.error?.message || "ok");
})();
