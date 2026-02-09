import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@spc/shared'],
  output: 'standalone',
}

export default nextConfig
