import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv } from 'vite'
import { loadConfig, productionEnvironment, readPort } from './src/config.server.ts'

const host = '0.0.0.0'

export default defineConfig(({ command, isPreview, mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const port = readPort(environment.PORT)

  if (command === 'serve') {
    loadConfig(isPreview ? productionEnvironment(environment) : environment)
  }

  return {
    server: { host, port, strictPort: true },
    preview: { host, port, strictPort: true },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      tanstackStart(),
      nitro({ plugins: ['./src/nitro.server.ts'] }),
      viteReact(),
    ],
  }
})
