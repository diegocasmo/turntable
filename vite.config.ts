import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { loadConfig, productionEnvironment, readPort } from './src/config.server.ts'

const host = '0.0.0.0'
const port = readPort(process.env.PORT)

export default defineConfig(({ command, isPreview }) => {
  if (command === 'serve') {
    loadConfig(isPreview ? productionEnvironment(process.env) : process.env)
  }

  return {
    server: { host, port, strictPort: true },
    preview: { host, port, strictPort: true },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss(), tanstackStart(), viteReact()],
  }
})
