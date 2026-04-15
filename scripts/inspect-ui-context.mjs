import { BrowserManager } from '../src/runtime/browser-manager.ts'
import { loadConfig } from '../src/runtime/config.ts'

const browser = new BrowserManager(loadConfig())
const state = await browser.openTarget('http://127.0.0.1:3847/')
const targetId = state.currentTabId

const info = await browser.evaluate(
  `(() => ({
    href: location.href,
    title: document.title,
    hasPrompt: !!document.getElementById('prompt'),
    hasSend: typeof window.send,
    statusText: document.getElementById('status')?.textContent || null,
    reply: document.getElementById('reply')?.textContent || null,
  }))()`,
  targetId,
)

const health = await browser.evaluate(
  `fetch('/health')
    .then((response) => response.json())
    .then((json) => JSON.stringify(json))
    .catch((error) => 'ERR:' + error.message)`,
  targetId,
)

const message = await browser.evaluate(
  `fetch('/api/message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: 'status?' }),
    })
      .then((response) => response.json())
      .then((json) => JSON.stringify(json))
      .catch((error) => 'ERR:' + error.message)`,
  targetId,
)

console.log(
  JSON.stringify(
    {
      targetId,
      info,
      health,
      message,
    },
    null,
    2,
  ),
)
