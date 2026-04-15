import process from 'node:process'
import { invokeReferenceTool } from './reference-tool-runtime.mjs'

const [, , toolName, inputJson = '{}'] = process.argv

if (!toolName) {
  console.error('Tool name is required')
  process.exit(1)
}

try {
  const input = JSON.parse(inputJson)
  const result = await invokeReferenceTool(toolName, input)
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) {
    process.exit(3)
  }
} catch (error) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        toolName,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  )
  process.exit(3)
}
