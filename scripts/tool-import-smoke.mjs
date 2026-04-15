import { promises as fs } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const toolFiles = [
  "src/tools/AgentTool/AgentTool.tsx",
  "src/tools/AskUserQuestionTool/AskUserQuestionTool.tsx",
  "src/tools/BashTool/BashTool.tsx",
  "src/tools/BriefTool/BriefTool.ts",
  "src/tools/ConfigTool/ConfigTool.ts",
  "src/tools/EnterPlanModeTool/EnterPlanModeTool.ts",
  "src/tools/EnterWorktreeTool/EnterWorktreeTool.ts",
  "src/tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts",
  "src/tools/ExitWorktreeTool/ExitWorktreeTool.ts",
  "src/tools/FileEditTool/FileEditTool.ts",
  "src/tools/FileReadTool/FileReadTool.ts",
  "src/tools/FileWriteTool/FileWriteTool.ts",
  "src/tools/GlobTool/GlobTool.ts",
  "src/tools/GrepTool/GrepTool.ts",
  "src/tools/LSPTool/LSPTool.ts",
  "src/tools/ListMcpResourcesTool/ListMcpResourcesTool.ts",
  "src/tools/MCPTool/MCPTool.ts",
  "src/tools/McpAuthTool/McpAuthTool.ts",
  "src/tools/NotebookEditTool/NotebookEditTool.ts",
  "src/tools/PowerShellTool/PowerShellTool.tsx",
  "src/tools/ReadMcpResourceTool/ReadMcpResourceTool.ts",
  "src/tools/RemoteTriggerTool/RemoteTriggerTool.ts",
  "src/tools/ScheduleCronTool/CronCreateTool.ts",
  "src/tools/ScheduleCronTool/CronDeleteTool.ts",
  "src/tools/ScheduleCronTool/CronListTool.ts",
  "src/tools/SendMessageTool/SendMessageTool.ts",
  "src/tools/SkillTool/SkillTool.ts",
  "src/tools/SleepTool/prompt.ts",
  "src/tools/SyntheticOutputTool/SyntheticOutputTool.ts",
  "src/tools/TaskCreateTool/TaskCreateTool.ts",
  "src/tools/TaskGetTool/TaskGetTool.ts",
  "src/tools/TaskListTool/TaskListTool.ts",
  "src/tools/TaskOutputTool/TaskOutputTool.tsx",
  "src/tools/TaskStopTool/TaskStopTool.ts",
  "src/tools/TaskUpdateTool/TaskUpdateTool.ts",
  "src/tools/TeamCreateTool/TeamCreateTool.ts",
  "src/tools/TeamDeleteTool/TeamDeleteTool.ts",
  "src/tools/TodoWriteTool/TodoWriteTool.ts",
  "src/tools/ToolSearchTool/ToolSearchTool.ts",
  "src/tools/WebFetchTool/WebFetchTool.ts",
  "src/tools/WebSearchTool/WebSearchTool.ts",
];

const results = [];
for (const file of toolFiles) {
  const full = path.join(cwd, file);
  try {
    await import(full);
    results.push({ file, status: "PASS" });
    console.log(`PASS ${file}`);
  } catch (error) {
    const message = error?.stack || error?.message || String(error);
    results.push({ file, status: "FAIL", message });
    console.log(`FAIL ${file}`);
    console.log(message.split("\n").slice(0, 6).join("\n"));
  }
}

const summary = {
  total: results.length,
  passed: results.filter((r) => r.status === "PASS").length,
  failed: results.filter((r) => r.status === "FAIL").length,
  results,
};

await fs.mkdir("audit/reports", { recursive: true });
await fs.mkdir("audit/logs", { recursive: true });
await fs.writeFile(
  "audit/reports/tool-import-smoke.json",
  JSON.stringify(summary, null, 2),
);
console.log(
  `SUMMARY total=${summary.total} passed=${summary.passed} failed=${summary.failed}`,
);
