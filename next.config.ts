import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.ELECTRON_BUILD === 'true' ? 'export' : undefined,
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },
  async headers() {
    return [
      {
        source: '/:all*.(jpg|jpeg|gif|png|webp|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/onboarding/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate',
          },
        ],
      },
    ];
  },
  async rewrites() {
    console.log('🔧 Next.js Rewrites Config - Browser-based processing mode');
    
    const rewrites = [];
    
    // Add static page rewrites
    rewrites.push({
      source: '/security',
      destination: '/security.html',
    });
    rewrites.push({
      source: '/privacy-policy',
      destination: '/privacy-policy/index.html',
    });
    rewrites.push({
      source: '/tos',
      destination: '/tos/index.html',
    });
    // Blog post rewrites
    rewrites.push({
      source: '/blog/the-data-driven-revolution-in-human-connection',
      destination: '/blog/the-data-driven-revolution-in-human-connection/page.html',
    });
    rewrites.push({
      source: '/blog/unlock-hidden-insights',
      destination: '/blog/unlock-hidden-insights/page.html',
    });
    rewrites.push({
      source: '/blog/why-we-built-a-whatsapp-chat-analyzer-that-reads-your-emotions',
      destination: '/blog/why-we-built-a-whatsapp-chat-analyzer-that-reads-your-emotions/page.html',
    });
    rewrites.push({
      source: '/blog/wild-revelations-from-whatsapp-chat-analyzers',
      destination: '/blog/wild-revelations-from-whatsapp-chat-analyzers/page.html',
    });
    
    // No API proxy needed - everything runs in the browser
    console.log('🚀 Browser-based mode - No backend API proxy');
    
    return rewrites;
  },
  // Environment variables are automatically available in Next.js with NEXT_PUBLIC_ prefix
  // No need to manually define them here - Coolify will inject them at build time
  webpack: (config, { isServer, webpack }) => {
    // Provide polyfills for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
      };
      
      // Provide Buffer globally
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    
    // Exclude archive and backup files from compilation
    config.module.rules.push(
      {
        test: /\/archive\/.*\.(ts|tsx|js|jsx)$/,
        use: 'ignore-loader',
      },
      {
        test: /\/backups\/.*\.(ts|tsx|js|jsx)$/,
        use: 'ignore-loader',
      },
      {
        test: /\/frontend\/archive\/.*\.(ts|tsx|js|jsx)$/,
        use: 'ignore-loader',
      },
      {
        test: /\/archive-old\/.*\.(ts|tsx|js|jsx)$/,
        use: 'ignore-loader',
      },
      {
        test: /\/TEMPLATE_new_feature\/.*\.(ts|tsx|js|jsx)$/,
        use: 'ignore-loader',
      }
    );
    
    // Optimize chunk splitting to prevent missing module errors
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
            },
          },
        },
      };
    }
    
    return config;
  },
  // Also exclude from page discovery
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].map(ext => 
    `${ext}` // This ensures only these extensions in valid locations are treated as pages
  ),
};

export default nextConfig;
