import { chromium } from 'playwright-core'

const executablePath = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173'
const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const problems = []

page.on('pageerror', (error) => problems.push(`PAGE ERROR: ${error.message}`))
page.on('requestfailed', (request) => {
  if (request.failure()?.errorText !== 'net::ERR_ABORTED') problems.push(`REQUEST FAILED: ${request.url()} — ${request.failure()?.errorText}`)
})

async function createTemplate(name) {
  await page.getByPlaceholder('Например, Грудь + руки').fill(name)
  await page.getByPlaceholder('Например, жим лёжа').fill('Тестовое упражнение')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await page.getByRole('heading', { name }).waitFor()
}

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Создать тренировку' }).click()
await createTemplate('День 1')
await page.getByRole('link', { name: 'Новая тренировка' }).click()
await createTemplate('День 2')
await page.getByRole('link', { name: 'Новая тренировка' }).click()
await createTemplate('День 3')

const before = await page.locator('.workout-card__body h3').allTextContents()
const source = await page.getByRole('button', { name: 'Переместить тренировку' }).nth(2).boundingBox()
const target = await page.getByRole('button', { name: 'Переместить тренировку' }).nth(0).boundingBox()
if (!source || !target) throw new Error('Drag handles are not visible')

await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
await page.mouse.down()
await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 14 })
await page.mouse.up()
await page.waitForTimeout(500)
const after = await page.locator('.workout-card__body h3').allTextContents()
await page.reload({ waitUntil: 'networkidle' })
const persisted = await page.locator('.workout-card__body h3').allTextContents()

const result = {
  before,
  after,
  persisted,
  reordered: before.join('|') === 'День 1|День 2|День 3' && after.join('|') === 'День 3|День 1|День 2',
  persistedAfterReload: persisted.join('|') === 'День 3|День 1|День 2',
  problems,
}
console.log(JSON.stringify(result, null, 2))
await browser.close()

if (!result.reordered || !result.persistedAfterReload || problems.length) process.exitCode = 1
