// Shared by scripts/screenshots.mjs and scripts/check.mjs:
// build with Vite, start `vite preview` on a fixed port, always stop it (Windows-safe).

import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const PORT = 4173
export const BASE = `http://localhost:${PORT}/plug-and-park/`

// Vite's JS entry, run with node directly (no shell): cross-platform, and kill() really stops it.
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')

export function build() {
  const r = spawnSync(process.execPath, [VITE_BIN, 'build', '--logLevel', 'warn'], { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`vite build failed (exit ${r.status})`)
}

async function waitForServer(url, timeoutMs = 20_000) {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Preview server did not start at ${url}`)
}

/** Starts `vite preview`; resolves once it answers. Returns a stop() function. */
export async function startPreview() {
  const server = spawn(process.execPath, [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const stop = () => {
    if (server.exitCode !== null) return
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
    else server.kill('SIGTERM')
  }
  process.on('exit', stop)
  process.on('SIGINT', () => {
    stop()
    process.exit(130)
  })
  try {
    await waitForServer(BASE)
  } catch (e) {
    stop()
    throw e
  }
  return stop
}
