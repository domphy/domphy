#!/usr/bin/env node
// domphy-press CLI: build | preview
// Usage:
//   domphy-press build [--config <file>] [--src <dir>] [--out <dir>]
//   domphy-press preview [--port <n>] [--out <dir>]

import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const args = process.argv.slice(2)
const command = args[0]

function flag(name: string): string | undefined {
  const index = args.indexOf(name)
  return index !== -1 ? args[index + 1] : undefined
}

if (command === "build") {
  const configFile = flag("--config") ?? "press.config.ts"
  const configPath = resolve(process.cwd(), configFile)
  if (!existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`)
    process.exit(1)
  }

  const { default: userConfig } = await import(pathToFileURL(configPath).href)
  const config = typeof userConfig === "function" ? await userConfig() : userConfig

  const srcDir = resolve(process.cwd(), flag("--src") ?? config.srcDir ?? ".")
  const outDir = resolve(process.cwd(), flag("--out") ?? config.outDir ?? "dist")
  const publicDir = resolve(process.cwd(), "public")
  const { buildSite } = await import("./build.js")

  await buildSite({
    config: { ...config, srcDir: flag("--src") ?? config.srcDir ?? ".", outDir: flag("--out") ?? config.outDir ?? "dist" },
    srcDir,
    outDir,
    publicDir: existsSync(publicDir) ? publicDir : undefined,
  })
} else if (command === "preview") {
  const port = Number(flag("--port") ?? 4173)
  const configFile = flag("--config") ?? "press.config.ts"
  const configPath = resolve(process.cwd(), configFile)
  let outDir = flag("--out")
  if (!outDir) {
    if (existsSync(configPath)) {
      const { default: userConfig } = await import(pathToFileURL(configPath).href)
      const config = typeof userConfig === "function" ? await userConfig() : userConfig
      outDir = resolve(process.cwd(), config.outDir ?? "dist")
    } else {
      outDir = resolve(process.cwd(), "dist")
    }
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
  console.error("Usage: domphy-press build | preview")
  process.exit(1)
}
