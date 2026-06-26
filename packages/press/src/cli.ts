#!/usr/bin/env node
// domphy-press CLI: build | dev | preview

import { existsSync, watch } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const args = process.argv.slice(2)
const command = args[0]

function flag(name: string): string | undefined {
  const index = args.indexOf(name)
  return index !== -1 ? args[index + 1] : undefined
}

async function loadConfig(configFile: string) {
  const configPath = resolve(process.cwd(), configFile)
  if (!existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`)
    process.exit(1)
  }
  const { default: userConfig } = await import(pathToFileURL(configPath).href)
  return typeof userConfig === "function" ? await userConfig() : userConfig
}

if (command === "build") {
  const config = await loadConfig(flag("--config") ?? "press.config.ts")
  const srcDir = resolve(process.cwd(), flag("--src") ?? config.srcDir ?? ".")
  const outDir = resolve(process.cwd(), flag("--out") ?? config.outDir ?? "dist")
  const publicDir = resolve(process.cwd(), "public")
  const { buildSite } = await import("./build.js")
  await buildSite({
    config: { ...config, srcDir: config.srcDir ?? ".", outDir: config.outDir ?? "dist" },
    srcDir, outDir,
    publicDir: existsSync(publicDir) ? publicDir : undefined,
  })
} else if (command === "dev") {
  const port = Number(flag("--port") ?? 3000)
  const configFile = flag("--config") ?? "press.config.ts"
  const config = await loadConfig(configFile)
  const srcDir = resolve(process.cwd(), flag("--src") ?? config.srcDir ?? ".")
  const outDir = resolve(process.cwd(), flag("--out") ?? config.outDir ?? ".press-dev")
  const publicDir = resolve(process.cwd(), "public")
  const { buildSite } = await import("./build.js")
  const { startDevServer } = await import("./serve.js")

  async function rebuild() {
    const start = Date.now()
    try {
      await buildSite({
        config: { ...config, srcDir: config.srcDir ?? ".", outDir: config.outDir ?? ".press-dev" },
        srcDir, outDir,
        publicDir: existsSync(publicDir) ? publicDir : undefined,
      })
      console.log(`Rebuilt in ${Date.now() - start}ms`)
    } catch (error) {
      console.error("Build error:", error)
    }
  }

  await rebuild()
  const { notify } = startDevServer(outDir, port)

  // Debounced file watcher
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null
  watch(srcDir, { recursive: true }, (_event, filename) => {
    if (!filename?.endsWith(".md") && !filename?.endsWith(".ts") && !filename?.endsWith(".js")) return
    if (rebuildTimer) clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(async () => {
      rebuildTimer = null
      console.log(`Changed: ${filename}`)
      await rebuild()
      notify()
    }, 150)
  })
  console.log(`Watching ${srcDir}`)
} else if (command === "preview") {
  const port = Number(flag("--port") ?? 4173)
  const configFile = flag("--config") ?? "press.config.ts"
  let outDir = flag("--out")
  if (!outDir) {
    const config = existsSync(resolve(process.cwd(), configFile)) ? await loadConfig(configFile) : null
    outDir = resolve(process.cwd(), config?.outDir ?? "dist")
  } else {
    outDir = resolve(process.cwd(), outDir)
  }
  if (!existsSync(outDir)) {
    console.error(`No build at ${outDir}. Run "domphy-press build" first.`)
    process.exit(1)
  }
  const { startServer } = await import("./serve.js")
  startServer(outDir, port)
} else {
  console.error(`Unknown command: ${command ?? "(none)"}`)
  console.error("Usage: domphy-press build | dev | preview")
  process.exit(1)
}
