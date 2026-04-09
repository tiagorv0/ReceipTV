const { chromium } = require('playwright')
const path = require('path')

const TARGET_URL = 'http://localhost:5173'
const SESSION_FILE = path.join(__dirname, 'receipttv-session.json')
const TEST_USER = process.env.TEST_USER || 'testes'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testes'

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('Abrindo página de login...')
  await page.goto(`${TARGET_URL}/login`)
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="text"]', TEST_USER)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')

  await page.waitForURL('**/', { timeout: 10000 })
  console.log('✅ Login realizado com sucesso')

  await context.storageState({ path: SESSION_FILE })
  console.log(`✅ Sessão salva em: ${SESSION_FILE}`)

  await browser.close()
})()
