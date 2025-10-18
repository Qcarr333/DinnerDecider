export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://dinnerdecider.app";
  const routes = [
    "",
    "/dinnerdecider",
    "/dinnerdecider/fetch",
    "/dinnerdecider/randomize",
    "/dinnerdecider/output",
    "/dinnerdecider/profile",
    "/dinnerdecider/refer",
    "/dinnerdecider/share",
  ];
  return routes.map((p) => ({ url: `${base}${p}`, changefreq: "weekly", priority: p === "/dinnerdecider" ? 1.0 : 0.6 }));
}

