import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = await readFile(path.join(root, 'public', 'icon.svg'))
const targets = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

await Promise.all(targets.map(({ name, size }) =>
  sharp(source).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(root, 'public', name)),
))

console.log(`Generated ${targets.length} PWA icons`)
