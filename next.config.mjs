/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // We use many external avatars and picsum
  },
  experimental: {
    // Enable any desired experimental features
  }
};

export default nextConfig;
