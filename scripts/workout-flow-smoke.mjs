import { chromium } from 'playwright-core'

const executablePath = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = process.argv[2] || 'http://127.0.0.1:4174'
const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const problems = []

page.on('pageerror', (error) => problems.push(`PAGE ERROR: ${error.message}`))
page.on('requestfailed', (request) => problems.push(`REQUEST FAILED: ${request.url()} — ${request.failure()?.errorText}`))

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Создать тренировку' }).click()
await page.getByPlaceholder('Например, Грудь + руки').fill('Тестовая программа')
await page.getByPlaceholder('Например, жим лёжа').fill('Жим лёжа')
await page.getByRole('button', { name: 'Сохранить' }).click()
await page.getByRole('heading', { name: 'Тестовая программа' }).waitFor()
await page.getByRole('button', { name: 'Начать' }).click()
await page.getByRole('heading', { name: 'Жим лёжа' }).waitFor()

const firstSet = page.locator('.set-row').first()
await firstSet.locator('input').nth(0).fill('80')
await firstSet.locator('input').nth(1).fill('8')
await firstSet.getByRole('button', { name: 'Завершить подход' }).click()
await page.getByRole('button', { name: 'Завершить', exact: true }).click()
await page.getByRole('button', { name: 'Сохранить результат' }).click()
await page.getByRole('button', { name: 'История' }).click()
await page.getByRole('heading', { name: 'Тестовая программа' }).waitFor()

const result = {
  route: new URL(page.url()).pathname,
  historyVisible: await page.getByRole('heading', { name: 'Тестовая программа' }).isVisible(),
  problems,
}
console.log(JSON.stringify(result, null, 2))
await browser.close()

if (!result.historyVisible || problems.length) process.exitCode = 1
