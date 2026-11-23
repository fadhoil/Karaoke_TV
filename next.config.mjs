/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
  allowedDevOrigins: [
    'pv-6d49e06ca110-d34629dd-a857-4b72-949d-bdb33ea236f7.style.dev',
    'pv-6d49e06ca110-9adc2c46-745e-44fe-896f-8925b2c6de21.style.dev',
  ],
};

export default nextConfig;
