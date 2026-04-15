#!/usr/bin/env node
/**
 * Nova Jarvis v2 — Interactive CLI
 * লাইভ চ্যাট ইন্টারফেস
 */

import readline from 'readline';
import { Agent } from './agent/Agent.js';
import { Logger } from './utils/Logger.js';
import { getWelcomeMessage, NOVA_IDENTITY } from './agent/Brain.js';

const logger = new Logger('CLI');

// রঙ কোড
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m', cyan: '\x1b[36m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  blue: '\x1b[34m', magenta: '\x1b[35m', gray: '\x1b[90m',
};

// ব্যবহারকারীর নাম পাও
const userName = process.env.NOVA_USER ?? process.argv[2] ?? 'Boss';

// এজেন্ট তৈরি করো
const agent = new Agent({
  model: process.env.NOVA_MODEL ?? 'gpt-4.1-mini',
  maxSteps: 20,
  userName,
  streaming: false,
});

// হেল্প মেসেজ
function showHelp(): void {
  console.log(`
${C.cyan}${C.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}
${C.bright}Nova Jarvis v2 — কমান্ড তালিকা${C.reset}
${C.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}

${C.yellow}বিশেষ কমান্ড:${C.reset}
  ${C.green}help${C.reset}          এই সাহায্য বার্তা দেখাও
  ${C.green}tools${C.reset}         সব উপলব্ধ টুলস দেখাও
  ${C.green}memory${C.reset}        সংরক্ষিত মেমোরি দেখাও
  ${C.green}reset${C.reset}         কথোপকথন রিসেট করো
  ${C.green}status${C.reset}        এজেন্টের অবস্থা দেখাও
  ${C.green}clear${C.reset}         স্ক্রিন পরিষ্কার করো
  ${C.green}exit / quit${C.reset}   বন্ধ করো

${C.yellow}উদাহরণ প্রশ্ন:${C.reset}
  "তুমি কে এবং কী করতে পারো?"
  "আমার ডেস্কটপে কী কী ফাইল আছে?"
  "Python দিয়ে একটি hello world প্রোগ্রাম লিখে চালাও"
  "আমার সিস্টেমের RAM কত?"
  "Google-এ AI news সার্চ করো"
  "আমার নাম Irfan মনে রাখো"

${C.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}
`);
}

// টুলস দেখাও
function showTools(): void {
  const tools = (agent as any).toolRegistry?.listTools?.() ?? [];
  console.log(`\n${C.cyan}${C.bright}উপলব্ধ টুলস (${tools.length}টি):${C.reset}`);
  tools.forEach((t: string, i: number) => {
    console.log(`  ${C.gray}${(i + 1).toString().padStart(2, '0')}.${C.reset} ${C.green}${t}${C.reset}`);
  });
  console.log();
}

// মেমোরি দেখাও
function showMemory(): void {
  const memories = agent.listMemories();
  if (memories.length === 0) {
    console.log(`\n${C.gray}কোনো মেমোরি সংরক্ষিত নেই।${C.reset}\n`);
    return;
  }
  console.log(`\n${C.cyan}${C.bright}সংরক্ষিত মেমোরি (${memories.length}টি):${C.reset}`);
  memories.forEach(m => {
    console.log(`  ${C.yellow}${m.key}${C.reset}: ${m.value}`);
  });
  console.log();
}

// স্ট্যাটাস দেখাও
function showStatus(): void {
  console.log(`\n${C.cyan}${C.bright}এজেন্ট স্ট্যাটাস:${C.reset}`);
  console.log(`  নাম: ${C.bright}${NOVA_IDENTITY.fullName} ${NOVA_IDENTITY.version}${C.reset}`);
  console.log(`  ব্যবহারকারী: ${C.bright}${userName}${C.reset}`);
  console.log(`  মডেল: ${C.bright}${process.env.NOVA_MODEL ?? 'gpt-4.1-mini'}${C.reset}`);
  console.log(`  ${agent.getMemorySummary()}`);
  console.log();
}

// মূল CLI ফাংশন
async function main(): Promise<void> {
  // স্বাগত বার্তা
  console.log(getWelcomeMessage(userName));

  // এজেন্ট ইনিশিয়ালাইজ করো
  agent.initialize();

  // readline ইন্টারফেস
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `\n${C.blue}${C.bright}${userName}${C.reset}${C.gray} ›${C.reset} `,
    terminal: true,
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // বিশেষ কমান্ড হ্যান্ডেল করো
    switch (input.toLowerCase()) {
      case 'exit':
      case 'quit':
      case 'বন্ধ':
        console.log(`\n${C.cyan}${C.bright}Nova:${C.reset} বিদায়, ${userName}। পরে দেখা হবে! 👋\n`);
        process.exit(0);

      case 'help':
      case 'সাহায্য':
        showHelp();
        rl.prompt();
        return;

      case 'tools':
      case 'টুলস':
        showTools();
        rl.prompt();
        return;

      case 'memory':
      case 'মেমোরি':
        showMemory();
        rl.prompt();
        return;

      case 'reset':
      case 'রিসেট':
        agent.resetConversation();
        console.log(`\n${C.cyan}${C.bright}Nova:${C.reset} কথোপকথন রিসেট করা হয়েছে। নতুন শুরু!\n`);
        rl.prompt();
        return;

      case 'status':
      case 'স্ট্যাটাস':
        showStatus();
        rl.prompt();
        return;

      case 'clear':
        console.clear();
        rl.prompt();
        return;
    }

    // এজেন্টে পাঠাও
    console.log();
    process.stdout.write(`${C.gray}⏳ Nova চিন্তা করছে...${C.reset}`);

    const startTime = Date.now();

    try {
      const response = await agent.run(
        input,
        undefined,
        (toolName, args) => {
          process.stdout.write(`\r${C.magenta}⚙ ${toolName}${C.reset} ব্যবহার করছি...    `);
        },
      );

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // টুল ইনফো মুছে ফেলো
      process.stdout.write('\r' + ' '.repeat(60) + '\r');

      // রেসপন্স দেখাও
      console.log(`${C.cyan}${C.bright}Nova:${C.reset} ${response.content}`);

      // মেটাডেটা (ডিবাগ মোডে)
      if (process.env.NOVA_DEBUG === 'true' && response.toolsUsed.length > 0) {
        console.log(`\n${C.gray}[${elapsed}s | টুলস: ${response.toolsUsed.join(', ')} | ধাপ: ${response.steps}]${C.reset}`);
      }

    } catch (error: any) {
      process.stdout.write('\r' + ' '.repeat(60) + '\r');
      console.log(`${C.red}${C.bright}Nova:${C.reset} ${C.red}দুঃখিত, একটি সমস্যা হয়েছে: ${error.message}${C.reset}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`\n${C.cyan}${C.bright}Nova:${C.reset} বিদায়, ${userName}! 👋\n`);
    process.exit(0);
  });

  // CTRL+C হ্যান্ডেল করো
  process.on('SIGINT', () => {
    console.log(`\n\n${C.cyan}${C.bright}Nova:${C.reset} বিদায়, ${userName}! 👋\n`);
    process.exit(0);
  });
}

main().catch(error => {
  logger.error('CLI crashed', error);
  process.exit(1);
});
