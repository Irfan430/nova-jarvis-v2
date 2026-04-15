import { OpenAI } from 'openai';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { Logger } from '../utils/Logger.js';

export interface AgentConfig {
  model: string;
  maxSteps: number;
  systemPrompt: string;
}

export class Agent {
  private client: OpenAI;
  private toolRegistry: ToolRegistry;
  private logger: Logger;

  constructor(private config: AgentConfig) {
    this.client = new OpenAI();
    this.toolRegistry = new ToolRegistry();
    this.logger = new Logger('Agent');
  }

  async run(userInput: string) {
    let history: any[] = [
      { role: 'system', content: this.config.systemPrompt },
      { role: 'user', content: userInput }
    ];

    for (let step = 0; step < this.config.maxSteps; step++) {
      this.logger.info(`Step ${step + 1}/${this.config.maxSteps}`);
      
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: history,
        tools: this.toolRegistry.getToolDefinitions(),
        tool_choice: 'auto',
      });

      const message = response.choices[0].message;
      history.push(message);

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          const result = await this.toolRegistry.execute(toolCall.function.name, JSON.parse(toolCall.function.arguments));
          history.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
      } else {
        return message.content;
      }
    }

    return "Reached maximum steps without a final answer.";
  }
}
