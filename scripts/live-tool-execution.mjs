import fs from "node:fs";
import path from "node:path";
import process from "node:process";

globalThis.MACRO ??= {
  VERSION: "0.1.0",
  BUILD_TIME: "",
  VERSION_CHANGELOG: "",
  PACKAGE_URL: "jarvis-local",
  NATIVE_PACKAGE_URL: "jarvis-local-native",
  FEEDBACK_CHANNEL: "support",
  ISSUES_EXPLAINER: "report the issue to your local Jarvis maintainer",
};

const root = process.cwd();
const auditDir = path.join(root, "audit");
const logsDir = path.join(auditDir, "logs");
const reportsDir = path.join(auditDir, "reports");
const liveConfigDir = path.join(root, ".nova", "live-claude");
const liveFile = path.join(root, ".nova", `live-tool-${Date.now()}.txt`);

fs.mkdirSync(logsDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(liveConfigDir, { recursive: true });

process.env.CLAUDE_CONFIG_DIR ??= liveConfigDir;
process.env.CLAUDE_CODE_ENABLE_TASKS ??= "true";
process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS ??= "true";
process.env.ENABLE_LSP_TOOL ??= "true";
process.env.CLAUDE_CODE_TEAM_NAME ??= `live-team-${Date.now()}`;
process.env.NODE_ENV ??= "production";

const { enableConfigs } = await import("../src/utils/config.js");
const { getDefaultMainLoopModel } = await import("../src/utils/model/model.js");
const { getDefaultAppState } = await import("../src/state/AppStateStore.js");
const { createFileStateCacheWithSizeLimit } = await import(
  "../src/utils/fileStateCache.js"
);
const { ConfigTool } = await import("../src/tools/ConfigTool/ConfigTool.js");
const { AskUserQuestionTool } = await import(
  "../src/tools/AskUserQuestionTool/AskUserQuestionTool.js"
);
const { FileWriteTool } = await import(
  "../src/tools/FileWriteTool/FileWriteTool.js"
);
const { FileReadTool } = await import(
  "../src/tools/FileReadTool/FileReadTool.js"
);
const { FileEditTool } = await import(
  "../src/tools/FileEditTool/FileEditTool.js"
);
const { GlobTool } = await import("../src/tools/GlobTool/GlobTool.js");
const { GrepTool } = await import("../src/tools/GrepTool/GrepTool.js");
const { BashTool } = await import("../src/tools/BashTool/BashTool.js");
const { WebFetchTool } = await import(
  "../src/tools/WebFetchTool/WebFetchTool.js"
);
const { TaskCreateTool } = await import(
  "../src/tools/TaskCreateTool/TaskCreateTool.js"
);
const { TaskListTool } = await import(
  "../src/tools/TaskListTool/TaskListTool.js"
);
const { TaskGetTool } = await import("../src/tools/TaskGetTool/TaskGetTool.js");
const { TodoWriteTool } = await import(
  "../src/tools/TodoWriteTool/TodoWriteTool.js"
);
const { TeamCreateTool } = await import(
  "../src/tools/TeamCreateTool/TeamCreateTool.js"
);
const { SendMessageTool } = await import(
  "../src/tools/SendMessageTool/SendMessageTool.js"
);
const { TeamDeleteTool } = await import(
  "../src/tools/TeamDeleteTool/TeamDeleteTool.js"
);
const { ListMcpResourcesTool } = await import(
  "../src/tools/ListMcpResourcesTool/ListMcpResourcesTool.js"
);
const { ReadMcpResourceTool } = await import(
  "../src/tools/ReadMcpResourceTool/ReadMcpResourceTool.js"
);
const { MCPTool } = await import("../src/tools/MCPTool/MCPTool.js");
const { LSPTool } = await import("../src/tools/LSPTool/LSPTool.js");
const { WebSearchTool } = await import(
  "../src/tools/WebSearchTool/WebSearchTool.js"
);

enableConfigs();

let appState = getDefaultAppState();
const fileCache = createFileStateCacheWithSizeLimit(128, 4 * 1024 * 1024);
const abortController = new AbortController();

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
    thinkingConfig: { type: "disabled" },
  },
  getAppState: () => appState,
  setAppState: updater => {
    appState =
      typeof updater === "function"
        ? updater(appState)
        : { ...appState, ...updater };
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
};

const matrix = [
  {
    name: "ConfigTool:get theme",
    tool: ConfigTool,
    input: { setting: "theme" },
  },
  {
    name: "AskUserQuestionTool",
    tool: AskUserQuestionTool,
    input: {
      questions: [
        {
          question: "Which mode?",
          header: "Mode",
          options: [{ label: "Fast", description: "Run fast" }],
        },
      ],
      answers: { "Which mode?": "Fast" },
    },
  },
  {
    name: "FileWriteTool",
    tool: FileWriteTool,
    input: { file_path: liveFile, content: "hello jarvis\n" },
  },
  {
    name: "FileReadTool",
    tool: FileReadTool,
    input: { file_path: liveFile },
  },
  {
    name: "FileEditTool",
    tool: FileEditTool,
    input: {
      file_path: liveFile,
      old_string: "hello jarvis",
      new_string: "hello nova",
    },
  },
  {
    name: "GlobTool",
    tool: GlobTool,
    input: { pattern: "src/app/*.ts" },
  },
  {
    name: "GrepTool",
    tool: GrepTool,
    input: { pattern: "express", include: "src/app/*.ts" },
  },
  {
    name: "BashTool",
    tool: BashTool,
    input: { command: "printf jarvis-bash-test" },
  },
  {
    name: "WebFetchTool",
    tool: WebFetchTool,
    input: {
      url: "https://developer.mozilla.org/en-US/",
      prompt: "Summarize the page briefly.",
    },
  },
  {
    name: "TaskCreateTool",
    tool: TaskCreateTool,
    input: { subject: "Live test task", description: "created by harness" },
  },
  {
    name: "TaskListTool",
    tool: TaskListTool,
    input: {},
  },
  {
    name: "TaskGetTool",
    tool: TaskGetTool,
    input: { taskId: "1" },
  },
  {
    name: "TodoWriteTool",
    tool: TodoWriteTool,
    input: {
      todos: [
        {
          content: "Harness todo",
          status: "in_progress",
          activeForm: "Testing live tools",
        },
      ],
    },
  },
  {
    name: "TeamCreateTool",
    tool: TeamCreateTool,
    input: { team_name: process.env.CLAUDE_CODE_TEAM_NAME, description: "Live test team" },
  },
  {
    name: "SendMessageTool:broadcast",
    tool: SendMessageTool,
    input: { to: "*", summary: "Live ping", message: "Harness message" },
  },
  {
    name: "TeamDeleteTool",
    tool: TeamDeleteTool,
    input: { team_name: process.env.CLAUDE_CODE_TEAM_NAME },
  },
  {
    name: "ListMcpResourcesTool",
    tool: ListMcpResourcesTool,
    input: {},
  },
  {
    name: "ReadMcpResourceTool:no-server",
    tool: ReadMcpResourceTool,
    input: { server: "missing", uri: "missing://resource" },
    expectFailure: true,
  },
  {
    name: "MCPTool:base-call",
    tool: MCPTool,
    input: { server_name: "missing", prompt: "noop" },
  },
  {
    name: "LSPTool:no-server",
    tool: LSPTool,
    input: { operation: "documentSymbol", filePath: "src/app/server.ts" },
  },
  {
    name: "WebSearchTool",
    tool: WebSearchTool,
    input: { query: "jarvis assistant" },
  },
];

const results = [];

for (const item of matrix) {
  const start = Date.now();
  try {
    const value = await item.tool.call(item.input, context);
    const status = item.expectFailure ? "UNEXPECTED_PASS" : "PASS";
    results.push({
      name: item.name,
      status,
      durationMs: Date.now() - start,
      detail: value,
    });
  } catch (error) {
    const status = item.expectFailure ? "EXPECTED_FAIL" : "FAIL";
    results.push({
      name: item.name,
      status,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const totals = {
  total: results.length,
  pass: results.filter(r => r.status === "PASS").length,
  fail: results.filter(r => r.status === "FAIL").length,
  expectedFail: results.filter(r => r.status === "EXPECTED_FAIL").length,
  unexpectedPass: results.filter(r => r.status === "UNEXPECTED_PASS").length,
};

const report = { totals, results };
const reportPath = path.join(reportsDir, "live-tool-execution.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
