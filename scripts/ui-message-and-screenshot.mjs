import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { BrowserManager } from '../src/runtime/browser-manager.ts'
import { loadConfig } from '../src/runtime/config.ts'

const [, , uiUrl = 'http://127.0.0.1:3847/', prompt = '', screenshotPath = 'audit/screenshots/ui-message.png'] =
  process.argv

if (!prompt) {
  console.error('Usage: node --import tsx scripts/ui-message-and-screenshot.mjs <uiUrl> <prompt> <screenshotPath>')
  process.exit(1)
}

const browser = new BrowserManager(loadConfig())
const state = await browser.openFreshTarget(uiUrl)
const targetId = state.currentTabId

for (let attempt = 0; attempt < 20; attempt += 1) {
  const hasPrompt = await browser.evaluate(
    `(() => !!document.getElementById('prompt'))()`,
    targetId,
  )
  if (hasPrompt) {
    break
  }
  await delay(300)
}

const actionResult = await browser.evaluate(
  `(() => {
    const field = document.getElementById('prompt')
    if (!(field instanceof HTMLTextAreaElement)) return 'missing-prompt'
    field.value = ${JSON.stringify(prompt)}
    field.dispatchEvent(new Event('input', { bubbles: true }))
    return fetch('/api/message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: ${JSON.stringify(prompt)} }),
    })
      .then((response) => response.json())
      .then((json) => {
        const reply = document.getElementById('reply')
        if (reply) {
          reply.textContent = json.reply?.text ?? json.error ?? 'No response'
        }
        return json.reply?.text ?? json.error ?? 'No response'
      })
      .catch((error) => 'ERR:' + error.message)
  })()`,
  targetId,
)

await delay(1000)
const replyText = await browser.evaluate(
  `(() => {
    const reply = document.getElementById('reply')
    return reply?.textContent?.trim() ?? ''
  })()`,
  targetId,
)

if (replyText && replyText !== 'No reply yet.') {
  await browser.captureScreenshot(screenshotPath, targetId)
  console.log(
    JSON.stringify(
      {
        ok: true,
        uiUrl,
        prompt,
        screenshotPath,
        replyText,
        targetId,
        actionResult,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

await browser.captureScreenshot(screenshotPath, targetId)
console.log(
  JSON.stringify(
    {
      ok: false,
      uiUrl,
      prompt,
      screenshotPath,
      replyText: 'No reply rendered before timeout',
      targetId,
      actionResult,
    },
    null,
    2,
  ),
)
process.exit(2)
