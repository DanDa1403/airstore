// @ts-check
import { defineConfig } from 'astro/config';

import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  server: { port: 4324 },

  adapter: netlify({
    edgeMiddleware: false,
  }),
});