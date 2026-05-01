import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    ".space-z.ai",
    ".space.chatglm.site",
  ],
  // Vercel-compatible settings
  serverExternalPackages: ['z-ai-web-dev-sdk'],
};

export default nextConfig;
