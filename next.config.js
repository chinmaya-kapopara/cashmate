const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add empty turbopack config to silence the warning
  // next-pwa uses webpack, so we'll use webpack for now
  turbopack: {},
};

module.exports = withPWA(nextConfig);
