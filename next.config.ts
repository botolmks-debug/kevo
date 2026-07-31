import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nama file middleware baru di Next.js 16
  serverExternalPackages: ["satori", "@resvg/resvg-js", "sharp"],
};

export default nextConfig;