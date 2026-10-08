import type { MetadataRoute } from "next";

const BASE_URL = "https://proofclean.ca";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ["/", "/pricing", "/privacy", "/terms"].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
  }));
}
