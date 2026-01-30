import type { NextConfig } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const isElectron = process.env.NEXT_BUILD_ELECTRON === 'true';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  // For Electron, use standalone server build
  ...(isElectron && {
    output: 'standalone',
  }),
  // Only use rewrites in development mode
  ...(isElectron
    ? {}
    : {
        async rewrites() {
          return [
            {
              source: '/api_be/:path*',
              destination: `${API_URL}/:path*`,
            },
          ];
        },
      }),
};

export default nextConfig;

