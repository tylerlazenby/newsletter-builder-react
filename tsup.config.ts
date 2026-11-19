import { defineConfig } from 'tsup'
import { copyFileSync } from 'node:fs'

export default defineConfig([
  {
    entry: ['index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    external: ['react', 'react-dom'],
    banner: {
      js: '"use client";',
    },
    onSuccess: async () => {
      copyFileSync('styles.css', 'dist/styles.css')
    },
  },
  {
    entry: ['node.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react', 'react-dom', 'nodemailer'],
  },
])