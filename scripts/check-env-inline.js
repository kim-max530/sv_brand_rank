const http = require("http");

http.get("http://localhost:3000/admin", (res) => {
  let d = "";
  res.on("data", (c) => (d += c));
  res.on("end", () => {
    console.log("html has publishable:", d.includes("sb_publishable"));
    console.log("html has supabase url:", d.includes("muplofnrjexvbggwyuyb"));
    const scripts = [...d.matchAll(/\/_next\/static\/chunks\/[^"']+/g)].map(
      (m) => m[0]
    );
    console.log("script count", scripts.length);
    const unique = [...new Set(scripts)].slice(0, 20);
    let left = unique.length;
    if (!left) process.exit(0);
    for (const path of unique) {
      http.get("http://localhost:3000" + path, (r) => {
        let body = "";
        r.on("data", (c) => (body += c));
        r.on("end", () => {
          if (body.includes("sb_publishable") || body.includes("SUPABASE_ANON")) {
            console.log("FOUND in", path);
            console.log(
              "snippet",
              body.includes("sb_publishable_1iR")
                ? "has key value"
                : "has SUPABASE_ANON string only"
            );
          }
          left -= 1;
          if (left === 0) console.log("done scanning chunks");
        });
      });
    }
  });
});
