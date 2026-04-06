import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import veauryVitePlugins from 'veaury/vite/index.js';
import eslint from 'vite-plugin-eslint';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/floweditor/',
  plugins: [
    react({
      // Configure React plugin without HMR
      fastRefresh: false, // Disable fast refresh since HMR is disabled
      jsxRuntime: 'automatic',
    }),
    // eslint({ cache: false }), // Temporarily disabled for testing
    tsconfigPaths({ loose: true }),
    viteCommonjs(),
    // Temporarily disable veauryVitePlugins to resolve React refresh conflicts
    // veauryVitePlugins({
    //   type: 'react'
    // })
  ],
  define: {
    // Safer global definitions to avoid string replacement conflicts
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'development',
    ),
    // Remove global replacement that was causing syntax errors
    // global: 'globalThis',
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: process.env.VITE_PORT || 3001,
    host: process.env.VITE_HOST || '0.0.0.0', // Bind to all interfaces
    hmr: false, // Disable HMR completely
    fs: {
      allow: ['..'],
    },
    cors: {
      origin: [
        'http://localhost:3000', // Chatwoot
        'http://localhost:3001', // FlowEditor Frontend
        'http://127.0.0.1:3000', // Chatwoot (127.0.0.1)
        'http://127.0.0.1:3001', // FlowEditor Frontend (127.0.0.1)
        'http://10.20.4.131:3000', // Additional Chatwoot instance
        'http://10.20.4.131:3001', // FlowEditor Frontend (IP)
        // Remove stage.thumb-crowd.com as it's not needed for local development
        // 'https://stage.thumb-crowd.com', // Production Chatwoot instance
        ...(process.env.VITE_CORS_ORIGIN
          ? process.env.VITE_CORS_ORIGIN.split(',')
          : []),
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Account-ID',
      ],
    },
    // Configure headers for iframe embedding - remove conflicting headers
    headers: {
      // Remove X-Frame-Options to let CSP frame-ancestors take precedence
    },
    proxy: {
      '/.netlify/functions/': {
        target: process.env.VITE_ASSET_SERVER_URL || 'http://localhost:8000/',
        changeOrigin: true,
      },
      // Same-origin proxy for FlowEditor API to avoid localhost/IP mismatch
      '/floweditor-api': {
        target: process.env.VITE_FLOWEDITOR_API_ORIGIN || 'http://localhost:8000',
        changeOrigin: true,
        // Map /floweditor-api/... to API server root ...
        rewrite: (path) => path.replace(/^\/floweditor-api/, ''),
      },
      // API proxy to route FlowEditor API calls to Chatwoot backend
      '/api': {
        target: process.env.VITE_CHATWOOT_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 Proxying API request:', req.method, req.url);
          });
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @import '@weni/unnnic-system/src/assets/scss/unnnic.scss';
        `,
      },
    },
  },
  test: {
    cache: true,
    clearMocks: true,
    globals: true,
    setupFiles: ['./vitest-setup.ts', 'vitest.d.ts'],
    environment: 'jsdom',
    root: 'src',
    pool: 'threads',
    coverage: {
      enabled: true,
      provider: 'istanbul',
      reporter: ['lcov', 'text', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        '__mocks__/**',
        'utils/**',
        'testUtils/**',
        'services/__mocks__/**',
        'assets/**',
        'static/**',
        'test/**',
        ...coverageConfigDefaults.exclude,
      ],
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    manifest: true,
    minify: 'esbuild',
    rollupOptions: {
      input: './index.html',
      output: {
        format: 'iife',
        assetFileNames: assetInfo => {
          const extType = assetInfo.name.split('.').at(1);
          console.log('extType', extType);
          if (/ttf|woff/i.test(extType)) {
            return 'sitestatic/assets/[name]-[hash][extname]';
          }

          return 'assets/[name]-[hash][extname]';
        },
        entryFileNames: chunkInfo => {
          // Force .js extension for all entry files
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: chunkInfo => {
          // Force .js extension for all chunk files
          return 'assets/[name]-[hash].js';
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    assetsInclude: [
      '**/*.jpg',
      '**/*.png',
      '**/*.svg',
      '**/*.ttf',
      '**/*.woff',
      '**/*.woff2',
    ],
  },
  optimizeDeps: {
    force: true,
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.ts': 'tsx',
        '.tsx': 'tsx',
      },
      target: 'es2020',
    },
  },
  esbuild: {
    target: 'es2020',
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
});
