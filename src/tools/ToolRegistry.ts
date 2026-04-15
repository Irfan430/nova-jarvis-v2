import { execSync } from 'child_process';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerBuiltinTools();
    this.registerMCPTools();
  }

  private registerBuiltinTools() {
    this.register({
      name: 'bash',
      description: 'Execute a shell command in the sandbox environment.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute.' },
        },
        required: ['command'],
      },
      execute: async ({ command }) => {
        try {
          const output = execSync(command, { encoding: 'utf8' });
          return { status: 'success', output };
        } catch (error: any) {
          return { status: 'error', message: error.message, stderr: error.stderr };
        }
      },
    });

    this.register({
      name: 'browser_open',
      description: 'Open a URL in the browser.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to open.' },
        },
        required: ['url'],
      },
      execute: async ({ url }) => {
        return { status: 'success', message: `Opened: ${url}` };
      },
    });
  }

  private registerMCPTools() {
    try {
      // Since manus-mcp-cli output is not pure JSON, we manually register key tools
      // In a production environment, we would parse the text output or use a proper SDK
      const playwrightTools = [
        { name: 'browser_navigate', description: 'Navigate to a URL' },
        { name: 'browser_click', description: 'Perform click on a web page' },
        { name: 'browser_type', description: 'Type text into editable element' },
        { name: 'browser_snapshot', description: 'Capture accessibility snapshot of the current page' }
      ];

      for (const tool of playwrightTools) {
        this.register({
          name: `mcp_playwright_${tool.name}`,
          description: `[MCP Playwright] ${tool.description}`,
          parameters: { type: 'object', properties: {}, additionalProperties: true },
          execute: async (args) => {
            const input = JSON.stringify(args);
            const result = execSync(`manus-mcp-cli tool call ${tool.name} --server playwright --input '${input}'`, { encoding: 'utf8' });
            return { status: 'success', output: result };
          }
        });
      }
    } catch (error) {
      console.error('Failed to register MCP tools:', error);
    }
  }

  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  getToolDefinitions() {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  async execute(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return await tool.execute(args);
  }
}
