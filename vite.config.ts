import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeBasePath(basePath: string): string {
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function resolveBuildBasePath(): string {
  const envBasePath = process.env.VITE_BASE_PATH
  if (envBasePath) {
    return normalizeBasePath(envBasePath)
  }

  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  return repoName ? `/${repoName}/` : '/'
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    // Keep local dev URL unchanged; build uses repo sub-path for GitHub Pages.
    base: command === 'serve' ? '/' : resolveBuildBasePath(),
  }
})
