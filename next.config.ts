import type { NextConfig } from "next";

// STATIC_EXPORT=1 produces a fully client-side build for GitHub Pages test
// links (the app runs on localStorage; API routes are removed by the Pages
// workflow before building and their fetches fail soft).
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  ...(staticExport
    ? {
        output: "export" as const,
        basePath: "/Org-Chart-Builder",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
