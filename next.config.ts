import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Allow any external image host (for hotel images pasted as URLs)
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
