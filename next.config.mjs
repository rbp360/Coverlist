import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Ensure the dev server ignores heavy folders and VCS metadata to prevent restarts on commit
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      ...(config.watchOptions || {}),
      ignored: [
        path.resolve(process.cwd(), '.git'),
        path.resolve(process.cwd(), 'node_modules'),
        '**/.next/**',
      ],
    };
    return config;
  },
};

export default nextConfig;
