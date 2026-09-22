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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log("key loaded:", Boolean(key), "len:", key?.length);

const sb = createClient(url, key);

(async () => {
  const list = await sb.storage.from("weekly_ranking").list("", { limit: 8 });
  if (list.error) console.log("list error:", list.error.message);
  else
    console.log(
      "list ok:",
      (list.data || []).map((d) => d.name).join(", ") || "(empty)"
    );

  const dl = await sb.storage.from("weekly_ranking").download("brand_info.csv");
  if (dl.error) console.log("download error:", dl.error.message);
  else console.log("download ok, size:", dl.data?.size ?? "(blob)");
})();
