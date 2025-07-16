import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(env.VITE_DEV_PORT ?? 5173)

  const inCodeServer =
    !!env.VSCODE_PROXY_URI ||
    env.CODE_SERVER === 'true' ||
    !!process.env.CODESPACES

  const proxyPrefix = inCodeServer ? `/absproxy/${devPort}` : ''

  const base =
    command === 'build'
      ? './'
      : inCodeServer
        ? `${proxyPrefix}/`
        : '/'

  const allowedHosts =
    env.ALLOWED_HOSTS
      ? env.ALLOWED_HOSTS.split(',').map(s => s.trim()).filter(Boolean)
      : inCodeServer
        ? true
        : undefined

  const proxy: Record<string, any> = {
    '/api' : {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  }

  if (inCodeServer) {
    proxy[`${proxyPrefix}/api`] = {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (p: string) => p.slice(proxyPrefix.length),
    }
  }

  return {
    plugins: [react()],
    base,
    server: {
      host: '0.0.0.0',
      port: devPort,
      allowedHosts,
      proxy,
    },
    preview: {
      port: devPort,
    },
  }
})