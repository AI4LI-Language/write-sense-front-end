import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features if needed
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Configure rewrites for API proxy (optional, if needed for CORS)
  async rewrites() {
    return [
      {
        source: '/api/agent/:path*',
        destination: 'http://localhost:8123/:path*',
      },
    ];
  },
  
  // Configure headers for development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
