import { Agent } from './agent/Agent.js';

async function test() {
  const agent = new Agent({
    model: 'gpt-4.1-mini',
    maxSteps: 10,
    systemPrompt: 'You are Nova Jarvis, an OS control agent. Use tools to help the user. Reply in Bangla if the user speaks Bangla.'
  });

  console.log('--- Testing Bash Tool ---');
  const bashResult = await agent.run('List the files in the current directory using bash.');
  console.log('Agent Response:', bashResult);

  console.log('\n--- Testing MCP Playwright Tool ---');
  const mcpResult = await agent.run('Use the MCP playwright tool to navigate to example.com.');
  console.log('Agent Response:', mcpResult);

  console.log('\n--- Testing Bangla Support ---');
  const banglaResult = await agent.run('তুমি কে? এবং তুমি কি কি করতে পারো?');
  console.log('Agent Response:', banglaResult);
}

test().catch(console.error);
