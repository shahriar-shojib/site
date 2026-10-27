import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

import { tanstackStart } from '@tanstack/solid-start/plugin/vite'

import solidPlugin from 'vite-plugin-solid'

// Every page is rendered to static HTML at build time.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  // Cloudflare Pages publishes dist, so the static site goes there and the throwaway server build stays out of it.
  environments: {
    client: { build: { outDir: 'dist' } },
    ssr: { build: { outDir: '.output/server' } },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      prerender: { enabled: true, crawlLinks: true, autoSubfolderIndex: false },
      pages: [{ path: '/404' }],
    }),
    solidPlugin({ ssr: true }),
  ],
})
