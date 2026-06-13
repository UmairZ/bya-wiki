import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-ical pulls in temporal-polyfill and rrule-temporal. Turbopack's
  // bundling re-routes globals like BigInt through a namespace object that
  // doesn't carry them, so the polyfill explodes ("e.BigInt is not a
  // function"). Forcing these packages to be required from node_modules at
  // runtime keeps their native global access intact.
  serverExternalPackages: [
    "node-ical",
    "temporal-polyfill",
    "rrule-temporal",
  ],
  // Allow next/image to optimize flyers served from the public Supabase
  // Storage bucket (stable public URLs, so optimization caches cleanly).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
