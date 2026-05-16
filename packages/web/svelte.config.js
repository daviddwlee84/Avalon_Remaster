import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// 'pages' = GH Pages style with a BASE_PATH subpath.
// 'static' = static-host with no subpath (used by the Docker image, served
// from the same Bun server as the WS endpoints).
// Anything else (default) = adapter-node for the original self-hosting path.
const target = process.env.BUILD_TARGET;
const isStaticBuild = target === 'pages' || target === 'static';
const basePath = target === 'pages' ? (process.env.BASE_PATH ?? '') : '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Pages build: pre-rendered static site under `build/`, served by GH Pages
    // under the BASE_PATH subdirectory. Default build: adapter-node — produces
    // a Bun/Node runnable bundle that can host both the SvelteKit app and (via
    // a sibling process) the @avalon/server WS endpoint on :3000.
    adapter: isStaticBuild
      ? adapterStatic({ pages: 'build', assets: 'build', fallback: 'index.html', precompress: false, strict: false })
      : adapterNode(),
    paths: { base: basePath },
    alias: {
      $lib: 'src/lib',
    },
  },
  compilerOptions: {
    runes: true,
  },
};

export default config;
