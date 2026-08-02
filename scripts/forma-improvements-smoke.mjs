import { chromium } from 'playwright-core'

const executablePath = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173'
const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const problems = []

page.on('pageerror', (error) => problems.push(`PAGE ERROR: ${error.message}`))
page.on('requestfailed', (request) => problems.push(`REQUEST FAILED: ${request.url()} — ${request.failure()?.errorText}`))

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Создать тренировку' }).click()
await page.getByPlaceholder('Например, Грудь + руки').fill('Проверка доработок')
await page.getByPlaceholder('Например, жим лёжа').fill('Жим лёжа')
await page.getByRole('button', { name: 'Сохранить' }).click()
await page.getByRole('button', { name: 'Начать' }).click()
await page.getByRole('heading', { name: 'Жим лёжа' }).waitFor()

const addExerciseButton = page.getByRole('button', { name: /Добавить упражнение/ })
await addExerciseButton.scrollIntoViewIfNeeded()
await addExerciseButton.click()
await page.getByPlaceholder('Например, жим гантелей').fill('Тяга гантели')
await page.getByRole('button', { name: 'Добавить', exact: true }).click()
await page.getByRole('heading', { name: 'Тяга гантели' }).waitFor()
const exerciseAddedDuringSession = await page.locator('.exercise-card').count() === 2

const firstSet = page.locator('.set-row').first()
await firstSet.locator('input').nth(0).fill('60')
await firstSet.locator('input').nth(1).fill('10')
await firstSet.getByRole('button', { name: 'Завершить подход' }).click()

await page.getByRole('link', { name: 'Dashboard' }).click()
await page.locator('.today-card--active .status-pill--active').waitFor()
const activeCardReplacesReadyCard = await page.getByText('Готова к старту', { exact: true }).count() === 0
  && await page.getByRole('heading', { name: 'Проверка доработок' }).isVisible()
const activeCardHasActions = await page.getByRole('button', { name: 'Продолжить', exact: true }).isVisible()
  && await page.getByRole('button', { name: 'Завершить', exact: true }).isVisible()

await page.getByRole('button', { name: 'Завершить', exact: true }).click()
await page.getByRole('button', { name: 'Сохранить результат' }).click()
await page.getByRole('link', { name: 'Тренировки' }).click()
await page.getByRole('button', { name: 'История' }).click()

const row = page.locator('.history-row').first()
await row.waitFor()
const rowMetrics = await row.locator('.history-row__metrics').innerText()
const historySummaryHasVolumeSetsAndTime = rowMetrics.includes('600 кг')
  && rowMetrics.includes('1\nподходы')
  && rowMetrics.includes('время')
const duplicateDateRemoved = await row.locator('.history-row__main span').count() === 0
await row.click({ position: { x: 110, y: 28 } })
await page.locator('.history-session-details').waitFor()
const wholeHistoryRowExpands = await page.locator('.history-session-details').isVisible()

const result = {
  exerciseAddedDuringSession,
  activeCardReplacesReadyCard,
  activeCardHasActions,
  historySummaryHasVolumeSetsAndTime,
  duplicateDateRemoved,
  wholeHistoryRowExpands,
  problems,
}
console.log(JSON.stringify(result, null, 2))
await browser.close()

if (Object.entries(result).some(([key, value]) => key !== 'problems' && value !== true) || problems.length) process.exitCode = 1
