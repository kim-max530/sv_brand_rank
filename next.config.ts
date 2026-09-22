import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    // 아바타 40px용 WebP 변환 품질
    qualities: [60, 75],
    imageSizes: [16, 32, 40, 48, 64, 80, 96],
    // Storage 원본을 변환한 결과를 길게 캐시
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "muplofnrjexvbggwyuyb.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/brand_image/**",
      },
      {
        protocol: "https",
        hostname: "muplofnrjexvbggwyuyb.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/brand_banner/**",
      },
    ],
  },
};

export default nextConfig;