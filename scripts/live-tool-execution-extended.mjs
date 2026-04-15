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
const reportsDir = path.join(root, "audit", "reports");
const configDir = path.join(root, ".nova", "live-claude");

fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(configDir, { recursive: true });

process.env.CLAUDE_CONFIG_DIR ??= configDir;
process.env.CLAUDE_CODE_ENABLE_TASKS ??= "true";
process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS ??= "true";
process.env.ENABLE_LSP_TOOL ??= "true";
process.env.NODE_ENV ??= "production";

const { enableConfigs } = await import("../src/utils/config.js");
const { getDefaultAppState } = await import("../src/state/AppStateStore.js");
const { createFileStateCacheWithSizeLimit } = await import(
  "../src/utils/fileStateCache.js"
);
const { getDefaultMainLoopModel } = await import("../src/utils/model/model.js");
const { getPlanFilePath } = await import("../src/utils/plans.js");

const { ConfigTool } = await import("../src/tools/ConfigTool/ConfigTool.js");
const { WebFetchTool } = await import("../src/tools/WebFetchTool/WebFetchTool.js");
const { WebSearchTool } = await import("../src/tools/WebSearchTool/WebSearchTool.js");
const { BashTool } = await import("../src/tools/BashTool/BashTool.js");
const { EnterPlanModeTool } = await import(
  "../src/tools/EnterPlanModeTool/EnterPlanModeTool.js"
);
const { EnterWorktreeTool } = await import(
  "../src/tools/EnterWorktreeTool/EnterWorktreeTool.js"
);
const { TaskCreateTool } = await import(
  "../src/tools/TaskCreateTool/TaskCreateTool.js"
);
const { TaskUpdateTool } = await import(
  "../src/tools/TaskUpdateTool/TaskUpdateTool.js"
);
const { ToolSearchTool } = await import(
  "../src/tools/ToolSearchTool/ToolSearchTool.js"
);
const { CronCreateTool } = await import(
  "../src/tools/ScheduleCronTool/CronCreateTool.js"
);
const { CronListTool } = await import(
  "../src/tools/ScheduleCronTool/CronListTool.js"
);
const { CronDeleteTool } = await import(
  "../src/tools/ScheduleCronTool/CronDeleteTool.js"
);
const { NotebookEditTool } = await import(
  "../src/tools/NotebookEditTool/NotebookEditTool.js"
);
const { PowerShellTool } = await import(
  "../src/tools/PowerShellTool/PowerShellTool.js"
);
const { RemoteTriggerTool } = await import(
  "../src/tools/RemoteTriggerTool/RemoteTriggerTool.js"
);

enableConfigs();

let appState = getDefaultAppState();
const fileCache = createFileStateCacheWithSizeLimit(128, 4 * 1024 * 1024);
const abortController = new AbortController();
const availableTools = [ConfigTool, WebFetchTool, WebSearchTool, BashTool];

const context = {
  abortController,
  readFileState: fileCache,
  options: {
    commands: [],
    tools: availableTools,
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
  setAppStateForTasks: updater => {
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
  updateFileHistoryState: () => {},
  messages: [],
};

const notebookPath = path.join(root, ".nova", "live-notebook.ipynb");
const notebookJson = {
  cells: [
    {
      cell_type: "markdown",
      id: "intro-cell",
      metadata: {},
      source: "hello notebook",
    },
  ],
  metadata: {
    language_info: { name: "python" },
  },
  nbformat: 4,
  nbformat_minor: 5,
};
fs.writeFileSync(notebookPath, `${JSON.stringify(notebookJson, null, 2)}\n`);
fileCache.set(notebookPath, {
  content: fs.readFileSync(notebookPath, "utf8"),
  timestamp: fs.statSync(notebookPath).mtimeMs,
  offset: undefined,
  limit: undefined,
});

const planPath = getPlanFilePath();
fs.mkdirSync(path.dirname(planPath), { recursive: true });
fs.writeFileSync(planPath, "# Live Plan\n\nTest plan content.\n", "utf8");

let cronId = null;

const matrix = [
  {
    name: "EnterPlanModeTool",
    run: async () => EnterPlanModeTool.call({}, context),
  },
  {
    name: "TaskCreateTool",
    run: async () =>
      TaskCreateTool.call(
        { subject: "Extended live task", description: "for update path" },
        context,
      ),
  },
  {
    name: "TaskUpdateTool",
    run: async () =>
      TaskUpdateTool.call(
        {
          taskId: "1",
          status: "in_progress",
          activeForm: "Running extended validation",
        },
        context,
      ),
  },
  {
    name: "ToolSearchTool",
    run: async () =>
      ToolSearchTool.call({ query: "web search", max_results: 3 }, context),
  },
  {
    name: "CronCreateTool",
    run: async () => {
      const result = await CronCreateTool.call(
        {
          cron: "*/15 * * * *",
          prompt: "ping me later",
          recurring: false,
          durable: false,
        },
        context,
      );
      cronId = result.data.id;
      return result;
    },
  },
  {
    name: "CronListTool",
    run: async () => CronListTool.call({}, context),
  },
  {
    name: "CronDeleteTool",
    run: async () => CronDeleteTool.call({ id: cronId }, context),
  },
  {
    name: "NotebookEditTool",
    run: async () =>
      NotebookEditTool.call(
        {
          notebook_path: notebookPath,
          cell_id: "intro-cell",
          new_source: "hello notebook updated",
          edit_mode: "replace",
        },
        context,
        undefined,
        { uuid: "live-parent-message" },
      ),
  },
  {
    name: "PowerShellTool",
    run: async () =>
      PowerShellTool.call(
        { command: 'Write-Output "jarvis-powershell-test"', timeout: 10000 },
        context,
      ),
  },
  {
    name: "EnterWorktreeTool",
    expectFailure: true,
    run: async () => EnterWorktreeTool.call({ name: "live-test-worktree" }, context),
  },
  {
    name: "RemoteTriggerTool",
    expectFailure: true,
    run: async () => RemoteTriggerTool.call({ action: "list" }, context),
  },
];

const results = [];
for (const item of matrix) {
  const start = Date.now();
  try {
    const detail = await item.run();
    results.push({
      name: item.name,
      status: item.expectFailure ? "UNEXPECTED_PASS" : "PASS",
      durationMs: Date.now() - start,
      detail,
    });
  } catch (error) {
    results.push({
      name: item.name,
      status: item.expectFailure ? "EXPECTED_FAIL" : "FAIL",
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
fs.writeFileSync(
  path.join(reportsDir, "live-tool-execution-extended.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(report, null, 2));
