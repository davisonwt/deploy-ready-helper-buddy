import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// @ts-ignore - vite-plugin-eslint types issue with package.json exports
import eslint from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  server: {
    host: "0.0.0.0", // Listen on all network interfaces
    port: 5173,
  },
  plugins: [
    react(),
    command === 'serve' && mode === 'development' && componentTagger(),
    command === 'serve' && eslint({
      failOnError: true, // Fail dev server on ESLint errors
      failOnWarning: false,
      emitError: true,
      emitWarning: true,
    }),
  ].filter(Boolean),
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // For error tracking and debugging
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@tanstack/react-query'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          supabase: ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
          solana: ['@solana/web3.js', '@solana/wallet-adapter-react'],
          admin: [
            './src/components/admin/EnhancedAnalyticsDashboard',
            './src/components/admin/UserManagementDashboard',
            './src/components/admin/ContentModerationDashboard'
          ],
          marketing: ['./src/components/marketing/CommissionDashboard'],
          gamification: ['./src/components/gamification/GamificationDashboard'],
        },
      },
    },
    minify: 'esbuild', // Use esbuild (built-in, faster than terser)
  },
  resolve: {
    dedupe: [
      'react', 
      'react-dom', 
      'react-dom/client', 
      'react/jsx-runtime', 
      'react-router-dom', 
      '@tanstack/react-query'
    ],
    alias: {
      // Force single React instance
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime.js'),
      "@": path.resolve(__dirname, "./src"),
      // Add Node.js polyfills for browser
      buffer: 'buffer',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
      util: 'util',
    },
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
    'process.version': '"v18.0.0"',
    'process.browser': 'true',
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'buffer',
      'crypto-browserify',
      'stream-browserify',
      'assert',
      'process',
      '@solana/web3.js',
      '@solana/spl-token',
    ],
  },
}));
