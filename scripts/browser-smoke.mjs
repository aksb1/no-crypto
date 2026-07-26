import { chromium } from 'playwright-core'

const executablePath = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const url = process.argv[2] || 'http://127.0.0.1:4174/'
const screenshotPath = process.argv[3]
const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const problems = []

page.on('pageerror', (error) => problems.push(`PAGE ERROR: ${error.message}`))
page.on('requestfailed', (request) => problems.push(`REQUEST FAILED: ${request.url()} — ${request.failure()?.errorText}`))
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(`CONSOLE ERROR: ${message.text()}`)
})

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
const pageContent = page.locator('main.page-content')
const snapshot = await pageContent.count() ? await pageContent.innerText() : await page.locator('body').innerText()
if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true })
console.log(JSON.stringify({ url: page.url(), title: await page.title(), content: snapshot.slice(0, 500), problems }, null, 2))
await browser.close()

if (!snapshot.trim() || problems.length) process.exitCode = 1
