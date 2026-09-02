import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // the parent folder has its own package-lock.json; keep Turbopack scoped to this repo
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
