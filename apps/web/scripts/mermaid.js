import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync } from 'fs'
import { basename, extname, join } from 'path'

const inputDir = './diagrams'
const outputDir = './public/figures'
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

const files = readdirSync(inputDir).filter((file) => extname(file).toLowerCase() === '.mmd')

if (files.length === 0) {
  console.log('No .mmd files found.')
  process.exit(0)
}

console.log(`Found ${files.length} file(s). Exporting...\n`)

let success = 0
let failed = 0

for (const file of files) {
  const inputPath = join(inputDir, file)
  const outputPath = join(outputDir, `${basename(file, '.mmd')}.png`)

  try {
    execSync(`${pnpmCommand} exec mmdc -i "${inputPath}" -o "${outputPath}" -s 2`, { stdio: 'inherit' })
    console.log(`OK  ${file} -> ${basename(outputPath)}`)
    success++
  } catch (error) {
    console.error(`FAILED  ${file}: ${error.message}`)
    failed++
  }
}

console.log(`\nDone: ${success} exported, ${failed} failed.`)
