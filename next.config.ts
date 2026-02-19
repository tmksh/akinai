import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'mvedkgtujsuctaemfnij.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'ppgehphfgstpvvtuhlru.supabase.co',
      },
    ],
  },
};

export default nextConfig;
