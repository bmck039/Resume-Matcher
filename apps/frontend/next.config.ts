import type { NextConfig } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const isElectron = process.env.NEXT_BUILD_ELECTRON === 'true';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  // For Electron, use standalone mode which allows dynamic routes
  // and works with file:// protocol serving
  ...(isElectron && {
    output: 'standalone',
    distDir: '.next',
  }),
  // Only use rewrites in development mode (not available in static export)
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

