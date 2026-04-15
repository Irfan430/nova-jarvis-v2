import { access } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const projectRoot = process.cwd()
const criticalFiles = [
  'dist/app/server.js',
  'dist/assistant/brain.js',
  'dist/assistant/goal-understanding.js',
  'dist/assistant/tool-brain.js',
  'dist/runtime/diagnostics.js',
  'dist/runtime/tool-bridge.js',
  'dist/orchestrator/follow-up.js',
]

for (const file of criticalFiles) {
  await access(path.join(projectRoot, file))
}

const prompts = [
  'YouTube খোলো',
  'youtube a ekta song play koro',
  'প্রথমটা চালাও',
  'what can you do',
  'open vscode',
  'switch to chrome',
  'is MCP available',
]

const sourceModule = await import(pathToFileURL(path.join(projectRoot, 'src/assistant/brain.js')).href)
const distModule = await import(pathToFileURL(path.join(projectRoot, 'dist/assistant/brain.js')).href)
const worldModel = await import(pathToFileURL(path.join(projectRoot, 'src/assistant/world-model.js')).href)

const makeContext = (input) => ({
  input,
  sessionId: 'dist-verify',
  nowIso: '2026-04-15T00:00:00.000Z',
  thread: input.includes('প্রথমটা')
    ? {
        ...worldModel.createThread('Search results', 'dist-verify'),
        browser: {
          ...worldModel.createThread('Search results', 'dist-verify').browser,
          currentUrl: 'https://www.youtube.com/results?search_query=bangla+song',
          currentDomain: 'www.youtube.com',
          visibleCandidates: ['https://www.youtube.com/watch?v=1'],
          candidateResults: [
            {
              index: 1,
              url: 'https://www.youtube.com/watch?v=1',
              title: 'Result 1',
              label: 'Result 1',
              snippet: null,
              actionHint: 'playable',
            },
          ],
        },
      }
    : null,
  browser: worldModel.createEmptyBrowserState(),
  lastAssistantReply: null,
})

const mismatches = []

for (const prompt of prompts) {
  const sourceDecision = sourceModule.decideTurn(makeContext(prompt))
  const distDecision = distModule.decideTurn(makeContext(prompt))
  const comparableSource = {
    domain: sourceDecision.goal.domain,
    actionStrategy: sourceDecision.actionStrategy,
    selectionIntent: sourceDecision.goal.selectionIntent,
  }
  const comparableDist = {
    domain: distDecision.goal.domain,
    actionStrategy: distDecision.actionStrategy,
    selectionIntent: distDecision.goal.selectionIntent,
  }
  if (JSON.stringify(comparableSource) !== JSON.stringify(comparableDist)) {
    mismatches.push({ prompt, source: comparableSource, dist: comparableDist })
  }
}

if (mismatches.length > 0) {
  console.error(JSON.stringify({ ok: false, mismatches }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: prompts.length }, null, 2))
