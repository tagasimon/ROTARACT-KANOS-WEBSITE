import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "exceljs", "@prisma/client"],
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  // The old check-in addresses now lead to the one permanent sign-in page.
  async redirects() {
    return [
      { source: "/check-in", destination: "/attend", permanent: false },
      { source: "/check-in/:path*", destination: "/attend", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=()" },
        ],
      },
    ];
  },
};
export default nextConfig;
