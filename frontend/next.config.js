/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Firebase Functions API URL 설정
  env: {
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'production' 
      ? 'https://asia-northeast3-oz-lecture.cloudfunctions.net/api/api'
      : 'http://localhost:5001/oz-lecture/asia-northeast3/api/api'
  }
};

module.exports = nextConfig;