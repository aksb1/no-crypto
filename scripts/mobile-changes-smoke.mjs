import { chromium } from 'playwright-core'

const executablePath = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173'
const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
const problems = []

page.on('pageerror', (error) => problems.push(`PAGE ERROR: ${error.message}`))
page.on('requestfailed', (request) => problems.push(`REQUEST FAILED: ${request.url()} — ${request.failure()?.errorText}`))

async function swipeLeft(locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Swipe target has no bounding box')
  const startX = box.x + box.width * 0.8
  const y = box.y + box.height / 2
  await page.mouse.move(startX, y)
  await page.mouse.down()
  await page.mouse.move(startX - 120, y, { steps: 8 })
  await page.mouse.up()
}

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Создать тренировку' }).click()
const nameInput = page.getByPlaceholder('Например, Грудь + руки')
await nameInput.waitFor()
const initialFocusIsName = await nameInput.evaluate((element) => element === document.activeElement)
await nameInput.fill('Мобильная тренировка')
await page.getByPlaceholder('Например, жим лёжа').fill('Жим лёжа')
await page.getByRole('button', { name: /Добавить упражнение/ }).click()
await page.getByPlaceholder('Например, жим лёжа').nth(1).fill('Тяга блока')
for (const select of await page.locator('.rest-field select').all()) await select.selectOption('0')
await page.getByRole('button', { name: 'Сохранить' }).click()
await page.getByRole('button', { name: 'Начать' }).click()
await page.getByRole('heading', { name: 'Жим лёжа' }).waitFor()

const exerciseHeaders = page.locator('.exercise-card__header')
const defaultCollapse = await page.locator('.exercise-card__body').count() === 1
  && await exerciseHeaders.nth(0).getAttribute('aria-expanded') === 'true'
  && await exerciseHeaders.nth(1).getAttribute('aria-expanded') === 'false'
const firstSetSpacing = await page.locator('.sets-list').evaluate((element) => getComputedStyle(element).marginTop === '6px')

const initialSetCount = await page.locator('.set-row').count()
await swipeLeft(page.locator('.set-row').first())
await page.waitForTimeout(250)
const afterSwipeSetCount = await page.locator('.set-row').count()
const timerDisabled = await page.getByText('Таймер отдыха отключён').isVisible()

const firstSet = page.locator('.set-row').first()
const firstWeight = firstSet.locator('input').nth(0)
const firstRepetitions = firstSet.locator('input').nth(1)
await firstWeight.fill('80')
await firstWeight.press('Enter')
const weightAdvancedToRepetitions = await firstRepetitions.evaluate((element) => element === document.activeElement)
await firstRepetitions.fill('8')
await firstRepetitions.press('Enter')
await page.locator('.set-row--completed').waitFor()
const lastSet = page.locator('.set-row').nth(1)
const lastWeight = lastSet.locator('input').nth(0)
const lastRepetitions = lastSet.locator('input').nth(1)
await page.waitForFunction((id) => document.activeElement?.id === id, await lastWeight.getAttribute('id'))
const repetitionsAdvancedToNextSet = await lastWeight.evaluate((element) => element === document.activeElement)
await lastWeight.fill('80')
await lastWeight.press('Enter')
const nextWeightAdvancedToRepetitions = await lastRepetitions.evaluate((element) => element === document.activeElement)
await lastRepetitions.fill('8')
await lastRepetitions.press('Enter')
await page.locator('.exercise-card--complete').waitFor()
await page.waitForTimeout(250)
const autoCollapsedWhenComplete = await exerciseHeaders.nth(0).getAttribute('aria-expanded') === 'false'
const completedCardClipped = await page.locator('.exercise-card--complete').evaluate((element) => {
  const style = getComputedStyle(element)
  return style.overflow === 'hidden' && style.borderRadius !== '0px' && style.backgroundImage !== 'none'
})
const restTimerCount = await page.locator('.rest-timer').count()
const finishButton = page.getByRole('button', { name: 'Завершить тренировку', exact: true })
await finishButton.scrollIntoViewIfNeeded()
await finishButton.click()
await page.getByRole('button', { name: 'Сохранить результат' }).click()

await page.getByRole('link', { name: 'Статистика' }).click()
const oneRmVisible = await page.getByText(/1RM|одноповторный максимум/i).count()
await page.getByRole('link', { name: 'Тренировки' }).click()
await page.getByRole('button', { name: 'История' }).click()
await swipeLeft(page.locator('.history-row').first())
await page.getByRole('heading', { name: 'Удалить тренировку?', exact: true }).waitFor()
const deleteConfirmationVisible = await page.getByText('Вы уверены, что хотите удалить тренировку?').isVisible()
await page.getByRole('button', { name: 'Удалить тренировку' }).click()
await page.getByText('История пока пуста').waitFor()

const result = {
  initialFocusIsName,
  defaultCollapse,
  firstSetSpacing,
  setSwipeDeleted: initialSetCount === 3 && afterSwipeSetCount === 2,
  keyboardSetFlow: weightAdvancedToRepetitions && repetitionsAdvancedToNextSet && nextWeightAdvancedToRepetitions,
  autoCollapsedWhenComplete,
  completedCardClipped,
  timerDisabled: timerDisabled && restTimerCount === 0,
  finishButtonAtBottom: true,
  oneRmRemoved: oneRmVisible === 0,
  historyDeleteConfirmed: deleteConfirmationVisible,
  problems,
}
console.log(JSON.stringify(result, null, 2))
await browser.close()

if (Object.entries(result).some(([key, value]) => key !== 'problems' && value !== true) || problems.length) process.exitCode = 1
