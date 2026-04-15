import process from 'node:process'
import readline from 'node:readline'
import { invokeReferenceTool } from './reference-tool-runtime.mjs'

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
})

function writeMessage(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

writeMessage({ type: 'ready' })

for await (const line of rl) {
  if (!line.trim()) {
    continue
  }

  let message
  try {
    message = JSON.parse(line)
  } catch {
    writeMessage({ id: null, ok: false, error: 'Invalid JSON request' })
    continue
  }

  if (message?.type === 'shutdown') {
    writeMessage({ id: message.id ?? null, ok: true, toolName: '__shutdown__' })
    process.exit(0)
  }

  const id = typeof message?.id === 'string' ? message.id : null
  const toolName = typeof message?.toolName === 'string' ? message.toolName : null
  const input =
    message?.input && typeof message.input === 'object' ? message.input : {}

  if (!toolName) {
    writeMessage({ id, ok: false, error: 'toolName is required' })
    continue
  }

  const result = await invokeReferenceTool(toolName, input)
  writeMessage({ id, ...result })
}
