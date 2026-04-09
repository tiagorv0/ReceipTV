const { chromium } = require('playwright')
const path = require('path')

const TARGET_URL = 'http://localhost:5173'
const SESSION_FILE = path.join(__dirname, 'receipttv-session.json')

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: SESSION_FILE })
  const page = await context.newPage()

  await page.goto(TARGET_URL)
  await page.waitForLoadState('networkidle')

  const url = page.url()
  const title = await page.title()

  if (url.includes('/login')) {
    console.error('❌ Sessão inválida — redirecionou para login')
  } else {
    console.log(`✅ Sessão válida — URL: ${url} | Título: ${title}`)
  }

  await browser.close()
})()
