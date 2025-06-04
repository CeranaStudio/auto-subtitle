import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // This is required for ffmpeg to work properly in Docker
  serverExternalPackages: ['ffmpeg-static']
};

export default nextConfig;
