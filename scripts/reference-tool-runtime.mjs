import process from 'node:process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

globalThis.MACRO ??= {
  VERSION: '0.1.0',
  BUILD_TIME: '',
  VERSION_CHANGELOG: '',
  PACKAGE_URL: 'jarvis-local',
  NATIVE_PACKAGE_URL: 'jarvis-local-native',
  FEEDBACK_CHANNEL: 'support',
  ISSUES_EXPLAINER: 'report the issue to your local Jarvis maintainer',
}

const liveConfigDir = '.nova/live-claude'
process.env.CLAUDE_CONFIG_DIR ??= liveConfigDir
process.env.CLAUDE_CODE_ENABLE_TASKS ??= 'true'
process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS ??= 'true'
process.env.ENABLE_LSP_TOOL ??= 'true'
process.env.NODE_ENV ??= 'production'

const { enableConfigs } = await import('../src/utils/config.js')
const { getDefaultMainLoopModel } = await import('../src/utils/model/model.js')
const { getDefaultAppState } = await import('../src/state/AppStateStore.js')
const {
  createFileStateCacheWithSizeLimit,
} = await import('../src/utils/fileStateCache.js')
const { ConfigTool } = await import('../src/tools/ConfigTool/ConfigTool.js')
const { FileWriteTool } = await import('../src/tools/FileWriteTool/FileWriteTool.js')
const { FileReadTool } = await import('../src/tools/FileReadTool/FileReadTool.js')
const { FileEditTool } = await import('../src/tools/FileEditTool/FileEditTool.js')
const { GlobTool } = await import('../src/tools/GlobTool/GlobTool.js')
const { GrepTool } = await import('../src/tools/GrepTool/GrepTool.js')
const { BashTool } = await import('../src/tools/BashTool/BashTool.js')
const { WebFetchTool } = await import('../src/tools/WebFetchTool/WebFetchTool.js')
const { WebSearchTool } = await import('../src/tools/WebSearchTool/WebSearchTool.js')
const { TaskCreateTool } = await import('../src/tools/TaskCreateTool/TaskCreateTool.js')
const { TaskListTool } = await import('../src/tools/TaskListTool/TaskListTool.js')
const { TaskGetTool } = await import('../src/tools/TaskGetTool/TaskGetTool.js')
const { TodoWriteTool } = await import('../src/tools/TodoWriteTool/TodoWriteTool.js')
const { TeamCreateTool } = await import('../src/tools/TeamCreateTool/TeamCreateTool.js')
const { SendMessageTool } = await import('../src/tools/SendMessageTool/SendMessageTool.js')
const { TeamDeleteTool } = await import('../src/tools/TeamDeleteTool/TeamDeleteTool.js')
const {
  ListMcpResourcesTool,
} = await import('../src/tools/ListMcpResourcesTool/ListMcpResourcesTool.js')
const {
  ReadMcpResourceTool,
} = await import('../src/tools/ReadMcpResourceTool/ReadMcpResourceTool.js')
const { MCPTool } = await import('../src/tools/MCPTool/MCPTool.js')
const { LSPTool } = await import('../src/tools/LSPTool/LSPTool.js')

enableConfigs()

let appState = getDefaultAppState()
const fileCache = createFileStateCacheWithSizeLimit(128, 4 * 1024 * 1024)
const abortController = new AbortController()

const context = {
  abortController,
  readFileState: fileCache,
  options: {
    commands: [],
    tools: [],
    mcpClients: [],
    isNonInteractiveSession: false,
    agentDefinitions: appState.agentDefinitions,
    mainLoopModel: getDefaultMainLoopModel(),
    thinkingConfig: { type: 'disabled' },
  },
  getAppState: () => appState,
  setAppState: (updater) => {
    appState =
      typeof updater === 'function' ? updater(appState) : { ...appState, ...updater }
  },
  setMessages: () => {},
  addMessage: () => {},
  setPendingToolUseIDs: () => {},
  setToolJSX: () => {},
  setInProgressToolUseIDs: () => {},
  setDebugMessage: () => {},
  getToolCallContext: () => null,
  setToolUseRejectReason: () => {},
  messages: [],
}

function seedFileStateIfNeeded(toolName, input) {
  if (
    (toolName !== 'file_write' && toolName !== 'file_edit') ||
    !input ||
    typeof input.file_path !== 'string'
  ) {
    return
  }

  const fullPath = path.resolve(process.cwd(), input.file_path)
  if (!existsSync(fullPath)) {
    return
  }

  const stat = statSync(fullPath)
  fileCache.set(fullPath, {
    content: readFileSync(fullPath, 'utf8'),
    timestamp: Math.floor(stat.mtimeMs),
    offset: undefined,
    limit: undefined,
  })
}

const tools = {
  config_get: ConfigTool,
  file_write: FileWriteTool,
  file_read: FileReadTool,
  file_edit: FileEditTool,
  glob: GlobTool,
  grep: GrepTool,
  bash: BashTool,
  web_fetch: WebFetchTool,
  web_search: WebSearchTool,
  task_create: TaskCreateTool,
  task_list: TaskListTool,
  task_get: TaskGetTool,
  todo_write: TodoWriteTool,
  team_create: TeamCreateTool,
  send_message: SendMessageTool,
  team_delete: TeamDeleteTool,
  list_mcp_resources: ListMcpResourcesTool,
  read_mcp_resource: ReadMcpResourceTool,
  mcp_call: MCPTool,
  lsp: LSPTool,
}

export function getReferenceToolNames() {
  return Object.keys(tools)
}

export async function invokeReferenceTool(toolName, input) {
  const tool = tools[toolName]
  if (!tool) {
    return {
      ok: false,
      toolName,
      error: `Unknown tool: ${toolName}`,
    }
  }

  try {
    seedFileStateIfNeeded(toolName, input)
    const result = await tool.call(input, context)
    return { ok: true, toolName, result }
  } catch (error) {
    return {
      ok: false,
      toolName,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
