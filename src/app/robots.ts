import type { MetadataRoute } from "next";

const BASE_URL = "https://proofclean.ca";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/clients",
        "/cleaners",
        "/map",
        "/account",
        "/api/",
        "/crew/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
