/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // output: 'export', // 주석 처리 - 동적 라우팅을 위해 비활성화
  images: {
    unoptimized: true,
  },
  // trailingSlash: true, // 주석 처리 - App Router에서는 필요 없음
  // API URL은 .env.local에서 관리
  // env 설정 제거 - .env.local의 설정을 사용
};

module.exports = nextConfig;