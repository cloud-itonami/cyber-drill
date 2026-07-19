import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: '0.0.0.0',
    port: 5180,
  },
  // `@etzhayyim/kami-engine-sdk` is `link:`-installed (workspace/path link).
  // The SDK ships pre-built ESM that imports `@langchain/langgraph` +
  // `@langchain/core` (peer deps used by `webvr/incident-pregel.js` +
  // `genko/canvas-pregel.js`). During the SSR build, Rollup walks the
  // SDK's actual filesystem path and cannot find sibling
  // `node_modules/@langchain/*` — they live in the consumer's node_modules.
  // Treat them as externals: the SvelteKit static-adapter prerender server
  // resolves them at prerender time from the consumer's node_modules; the
  // client bundle never sees the import because the webvr engine is only
  // instantiated at runtime (after SSR/prerender hydration).
  build: {
    rollupOptions: {
      external: ['@langchain/langgraph', '@langchain/core'],
    },
  },
});
