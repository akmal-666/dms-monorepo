/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // For Cloudflare Pages deployment with @cloudflare/next-on-pages
  // output: 'export', // Only use for pure static; Workers Sites preferred
};

module.exports = nextConfig;
