/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static generation for pages that require runtime environment variables
  output: 'standalone',
  
  // Skip type checking in production build (already done in dev)
  typescript: {
    // We still want TypeScript errors in dev, but not block build
    ignoreBuildErrors: false,
  },
  
  // ESLint config
  eslint: {
    // Only run on these directories during build
    dirs: ['src'],
  },

  // Environment variables placeholder for build time
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
  },
};

export default nextConfig;
