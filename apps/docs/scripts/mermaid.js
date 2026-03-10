import { execSync } from 'child_process'
import { readdirSync, mkdirSync, existsSync } from 'fs'
import { join, basename, extname } from 'path'

const inputDir  = './diagrams'
const outputDir = './figures'

if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })

const files = readdirSync(inputDir).filter(f => extname(f).toLowerCase() === '.mmd')

if (files.length === 0) {
  console.log('No .mmd files found.')
  process.exit(0)
}

console.log(`Found ${files.length} file(s). Exporting...\n`)

let success = 0, failed = 0

for (const file of files) {
  const inputPath  = join(inputDir, file)
  const outputPath = join(outputDir, basename(file, '.mmd') + '.png')

  try {
    execSync(`pnpm mmdc -i "${inputPath}" -o "${outputPath}" -s 2`, { stdio: 'inherit' })
    console.log(`✅  ${file} → ${basename(outputPath)}`)
    success++
  } catch (err) {
    console.error(`❌  ${file} — FAILED: ${err.message}`)
    failed++
  }
}

console.log(`\nDone: ${success} exported, ${failed} failed.`)