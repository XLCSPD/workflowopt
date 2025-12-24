/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static generation for pages that require runtime environment variables
  output: 'standalone',
  
  // Webpack configuration for pptxgenjs and react-pdf/pdfjs-dist
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fallback for node modules used by pptxgenjs in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        https: false,
        http: false,
        crypto: false,
        stream: false,
        zlib: false,
        net: false,
        tls: false,
        canvas: false,
      };
      
      // Fix for react-pdf/pdfjs-dist compatibility with Next.js
      // This prevents the "Object.defineProperty called on non-object" error
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
  
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

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Allow PDF.js worker from unpkg CDN
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // Allow HTML5 video/audio from Supabase Storage (and other https sources)
              // Without this, default-src 'self' blocks media and videos show 0:00 / 0:00.
              "media-src 'self' blob: https:",
              // Allow PDF.js worker (uses blob: URLs) and connections to fetch PDFs
              "worker-src 'self' blob:",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co'} wss://*.supabase.co https://unpkg.com`,
              // Allow iframes to load PDFs from Supabase Storage
              `frame-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co'}`,
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
