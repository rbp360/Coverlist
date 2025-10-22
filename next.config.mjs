import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Use supported webpack hook to adjust watchOptions during development
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [
          path.resolve(process.cwd(), '.git'),
          path.resolve(process.cwd(), 'node_modules'),
          '**/.next/**',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
