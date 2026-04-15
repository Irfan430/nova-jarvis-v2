import { z } from 'zod';

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
        // Implementation for executing bash command
        return { status: 'success', output: `Executed: ${command}` };
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
        // Implementation for opening browser
        return { status: 'success', message: `Opened: ${url}` };
      },
    });
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
