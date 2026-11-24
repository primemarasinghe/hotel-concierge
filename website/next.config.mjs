/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    // Only proxy known backend prefixes — never touch /api/auth (NextAuth)
    const backendPrefixes = ['properties', 'booking', 'conversations'];
    return backendPrefixes.map(prefix => ({
      source: `/api/${prefix}/:path*`,
      destination: `${apiUrl}/api/${prefix}/:path*`,
    }));
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },
};

export default nextConfig;
