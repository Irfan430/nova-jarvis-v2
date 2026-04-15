/**
 * Nova Jarvis v2 — Test Suite
 */
import { Agent } from './agent/Agent.js';
import { Logger } from './utils/Logger.js';

const logger = new Logger('Test');

async function runTest(agent: Agent, testName: string, input: string): Promise<boolean> {
  logger.separator();
  logger.info(`টেস্ট: ${testName}`);
  logger.user(input);
  try {
    const response = await agent.run(input, undefined, (toolName) => logger.tool(toolName));
    logger.nova(response.content);
    logger.info(`✓ সফল | টুলস: [${response.toolsUsed.join(', ')}] | ধাপ: ${response.steps}`);
    return true;
  } catch (error: any) {
    logger.error(`✗ ব্যর্থ: ${error.message}`);
    return false;
  }
}

async function main(): Promise<void> {
  logger.info('Nova Jarvis v2 — টেস্ট শুরু হচ্ছে...');
  const agent = new Agent({ model: 'gpt-4.1-mini', maxSteps: 10, userName: 'Irfan' });
  agent.initialize();
  const results: boolean[] = [];

  results.push(await runTest(agent, 'পরিচয় পরীক্ষা', 'তুমি কে? তোমার নাম কী? তুমি কী কী করতে পারো?'));
  results.push(await runTest(agent, 'Bash টুল পরীক্ষা', 'বর্তমান ডিরেক্টরিতে কী কী ফাইল আছে bash দিয়ে দেখাও।'));
  results.push(await runTest(agent, 'সিস্টেম তথ্য পরীক্ষা', 'আমার সিস্টেমের RAM এবং CPU তথ্য দাও।'));
  results.push(await runTest(agent, 'ফাইল তৈরি পরীক্ষা', '/tmp/nova_test.txt ফাইলে "Nova Jarvis v2 কাজ করছে!" লিখে সেটা পড়ে দেখাও।'));
  results.push(await runTest(agent, 'মেমোরি পরীক্ষা', 'আমার নাম Irfan এবং আমি বাংলাদেশে থাকি — এটা মনে রাখো।'));
  results.push(await runTest(agent, 'তারিখ ও সময় পরীক্ষা', 'এখন কয়টা বাজে এবং আজকের তারিখ কী?'));

  logger.separator();
  const passed = results.filter(Boolean).length;
  logger.info(`📊 ফলাফল: ${passed}/${results.length} টেস্ট সফল`);
  if (passed === results.length) logger.success('সব টেস্ট পাস! Nova Jarvis v2 সম্পূর্ণ প্রস্তুত। 🚀');
  else logger.warn(`${results.length - passed}টি টেস্ট ব্যর্থ হয়েছে।`);
  logger.info(agent.getMemorySummary());
}

main().catch(error => { logger.error('টেস্ট ক্র্যাশ হয়েছে', error); process.exit(1); });
