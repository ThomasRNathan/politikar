import type { NextConfig } from "next";

// Alternate hostnames that must funnel to the canonical politikar.com so
// search engines only ever see one copy (no duplicate content). Exact-host
// matches only — preview deployments and localhost are untouched.
const ALTERNATE_HOSTS = [
  "www.politikar.com",
  "politikar.fr",
  "www.politikar.fr",
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
    ],
  },
  async redirects() {
    return ALTERNATE_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://politikar.com/:path*",
      permanent: true,
    }));
  },
};

export default nextConfig;
