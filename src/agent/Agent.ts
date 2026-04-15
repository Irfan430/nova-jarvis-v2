import OpenAI from 'openai';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { Logger } from '../utils/Logger.js';
import { Memory } from './Memory.js';
import { buildSystemPrompt, NOVA_IDENTITY } from './Brain.js';

export interface AgentConfig {
  model?: string;
  maxSteps?: number;
  userName?: string;
  streaming?: boolean;
}

export interface AgentResponse {
  content: string;
  toolsUsed: string[];
  steps: number;
  success: boolean;
}

export class Agent {
  private client: OpenAI;
  private toolRegistry: ToolRegistry;
  private logger: Logger;
  private memory: Memory;
  private config: Required<AgentConfig>;
  private initialized: boolean = false;

  constructor(config: AgentConfig = {}) {
    this.config = {
      model: config.model ?? 'gpt-4.1-mini',
      maxSteps: config.maxSteps ?? 20,
      userName: config.userName ?? 'Boss',
      streaming: config.streaming ?? false,
    };
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.toolRegistry = new ToolRegistry();
    this.logger = new Logger('Nova');
    this.memory = new Memory(60);
  }

  initialize(): void {
    if (this.initialized) return;
    const systemPrompt = buildSystemPrompt(this.config.userName);
    this.memory.addMessage({ role: 'system', content: systemPrompt });
    this.initialized = true;
    this.logger.info(`${NOVA_IDENTITY.fullName} ${NOVA_IDENTITY.version} initialized for ${this.config.userName}`);
  }

  async run(
    userInput: string,
    onToken?: (token: string) => void,
    onToolCall?: (toolName: string, args: any) => void,
  ): Promise<AgentResponse> {
    if (!this.initialized) this.initialize();
    this.memory.addMessage({ role: 'user', content: userInput });
    const toolsUsed: string[] = [];
    let totalSteps = 0;
    let finalContent = '';
    try {
      for (let step = 0; step < this.config.maxSteps; step++) {
        totalSteps = step + 1;
        this.logger.debug(`Step ${totalSteps}/${this.config.maxSteps}`);
        const history = this.memory.getHistory();
        const tools = this.toolRegistry.getToolDefinitions();
        const response = await this.client.chat.completions.create({
          model: this.config.model,
          messages: history as any,
          tools: tools as any,
          tool_choice: 'auto',
          temperature: 0.7,
        });
        const message = response.choices[0].message;
        this.memory.addMessage(message as any);
        if (!message.tool_calls || message.tool_calls.length === 0) {
          finalContent = message.content ?? '';
          if (onToken) onToken(finalContent);
          break;
        }
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          let args: any = {};
          try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch { args = {}; }
          toolsUsed.push(toolName);
          if (onToolCall) onToolCall(toolName, args);
          this.logger.tool(toolName, args);
          const result = await this.toolRegistry.execute(toolName, args);
          this.memory.addMessage({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });
        }
      }
      if (!finalContent) finalContent = 'কাজ সম্পন্ন হয়েছে।';
      return { content: finalContent, toolsUsed, steps: totalSteps, success: true };
    } catch (error: any) {
      const errorMsg = `দুঃখিত, একটি সমস্যা হয়েছে: ${error.message}`;
      this.logger.error('Agent run failed', error);
      return { content: errorMsg, toolsUsed, steps: totalSteps, success: false };
    }
  }

  resetConversation(): void {
    this.memory.resetConversation();
    this.initialized = false;
    this.logger.info('Conversation reset');
  }

  remember(key: string, value: string): void { this.memory.remember(key, value); }
  recall(key: string): string | null { return this.memory.recall(key); }
  getMemorySummary(): string { return this.memory.getSummary(); }
  listMemories() { return this.memory.listMemories(); }
}
