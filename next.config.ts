import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Uploaded images are overwritten in-place (same filename) when we re-encode/optimize.
    // Avoid long-lived client/proxy caching to prevent "stale colors" after a server-side fix.
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    qualities: [70, 75],
  },
};

export default nextConfig;
