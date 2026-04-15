import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerAllTools();
  }

  private registerAllTools(): void {
    this.registerBashTool();
    this.registerFileTools();
    this.registerWebTools();
    this.registerSystemTools();
    this.registerMemoryTools();
    this.registerBrowserTools();
  }

  private registerBashTool(): void {
    this.register({
      name: 'bash',
      description: 'যেকোনো শেল কমান্ড চালাও। ফাইল দেখা, প্রোগ্রাম চালানো, git, npm/pip, সব কিছু।',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'চালানোর শেল কমান্ড' },
          cwd: { type: 'string', description: 'কাজের ডিরেক্টরি (ঐচ্ছিক)' },
          timeout: { type: 'number', description: 'টাইমআউট সেকেন্ডে (ডিফল্ট: 30)' },
        },
        required: ['command'],
      },
      execute: async ({ command, cwd, timeout = 30 }) => {
        try {
          const options: any = { encoding: 'utf8', timeout: timeout * 1000, maxBuffer: 10 * 1024 * 1024 };
          if (cwd) options.cwd = cwd;
          const { stdout, stderr } = await execAsync(command, options);
          return { success: true, stdout: stdout.trim(), stderr: stderr.trim(), output: stdout.trim() || stderr.trim() };
        } catch (error: any) {
          return { success: false, error: error.message, stdout: error.stdout?.trim() ?? '', stderr: error.stderr?.trim() ?? '' };
        }
      },
    });
  }

  private registerFileTools(): void {
    this.register({
      name: 'file_read',
      description: 'যেকোনো ফাইলের বিষয়বস্তু পড়ো। কোড, টেক্সট, কনফিগ সব কিছু।',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'ফাইলের পাথ' },
          start_line: { type: 'number', description: 'শুরুর লাইন নম্বর (ঐচ্ছিক)' },
          end_line: { type: 'number', description: 'শেষের লাইন নম্বর (ঐচ্ছিক)' },
        },
        required: ['file_path'],
      },
      execute: async ({ file_path, start_line, end_line }) => {
        try {
          const fullPath = path.resolve(file_path);
          if (!fs.existsSync(fullPath)) return { success: false, error: `ফাইল পাওয়া যায়নি: ${file_path}` };
          let content = fs.readFileSync(fullPath, 'utf8');
          if (start_line || end_line) {
            const lines = content.split('\n');
            content = lines.slice((start_line ?? 1) - 1, end_line ?? lines.length).join('\n');
          }
          return { success: true, content, path: fullPath, size: content.length };
        } catch (error: any) { return { success: false, error: error.message }; }
      },
    });

    this.register({
      name: 'file_write',
      description: 'নতুন ফাইল তৈরি করো বা বিদ্যমান ফাইল ওভাররাইট করো।',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'ফাইলের পাথ' },
          content: { type: 'string', description: 'ফাইলে লেখার বিষয়বস্তু' },
          create_dirs: { type: 'boolean', description: 'ডিরেক্টরি না থাকলে তৈরি করো (ডিফল্ট: true)' },
        },
        required: ['file_path', 'content'],
      },
      execute: async ({ file_path, content, create_dirs = true }) => {
        try {
          const fullPath = path.resolve(file_path);
          if (create_dirs) fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, content, 'utf8');
          return { success: true, path: fullPath, bytes: content.length };
        } catch (error: any) { return { success: false, error: error.message }; }
      },
    });

    this.register({
      name: 'file_edit',
      description: 'বিদ্যমান ফাইলে নির্দিষ্ট টেক্সট খুঁজে প্রতিস্থাপন করো।',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'ফাইলের পাথ' },
          old_text: { type: 'string', description: 'যে টেক্সট পরিবর্তন করতে হবে' },
          new_text: { type: 'string', description: 'নতুন টেক্সট' },
        },
        required: ['file_path', 'old_text', 'new_text'],
      },
      execute: async ({ file_path, old_text, new_text }) => {
        try {
          const fullPath = path.resolve(file_path);
          if (!fs.existsSync(fullPath)) return { success: false, error: `ফাইল পাওয়া যায়নি: ${file_path}` };
          const content = fs.readFileSync(fullPath, 'utf8');
          if (!content.includes(old_text)) return { success: false, error: 'নির্দিষ্ট টেক্সট ফাইলে পাওয়া যায়নি' };
          fs.writeFileSync(fullPath, content.replace(old_text, new_text), 'utf8');
          return { success: true, path: fullPath };
        } catch (error: any) { return { success: false, error: error.message }; }
      },
    });

    this.register({
      name: 'list_directory',
      description: 'কোনো ডিরেক্টরির ফাইল ও ফোল্ডার তালিকা দেখো।',
      parameters: {
        type: 'object',
        properties: {
          dir_path: { type: 'string', description: 'ডিরেক্টরির পাথ (ডিফল্ট: বর্তমান)' },
          show_hidden: { type: 'boolean', description: 'লুকানো ফাইল দেখাও' },
        },
        required: [],
      },
      execute: async ({ dir_path = '.', show_hidden = false }) => {
        try {
          const fullPath = path.resolve(dir_path);
          const entries = fs.readdirSync(fullPath, { withFileTypes: true });
          const items = entries
            .filter(e => show_hidden || !e.name.startsWith('.'))
            .map(e => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' }));
          return { success: true, path: fullPath, items, count: items.length };
        } catch (error: any) { return { success: false, error: error.message }; }
      },
    });
  }

  private registerWebTools(): void {
    this.register({
      name: 'web_fetch',
      description: 'যেকোনো URL থেকে তথ্য আনো। ওয়েবসাইট, API, JSON ডেটা সব কিছু।',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'ফেচ করার URL' },
          method: { type: 'string', description: 'HTTP মেথড (GET/POST, ডিফল্ট: GET)' },
        },
        required: ['url'],
      },
      execute: async ({ url, method = 'GET' }) => {
        try {
          const cmd = `curl -s -L --max-time 15 -X ${method} "${url}" 2>&1 | head -c 50000`;
          const { stdout } = await execAsync(cmd);
          let parsed = null;
          try { parsed = JSON.parse(stdout); } catch { }
          return { success: true, url, content: stdout, parsed, length: stdout.length };
        } catch (error: any) { return { success: false, error: error.message, url }; }
      },
    });

    this.register({
      name: 'web_search',
      description: 'ইন্টারনেটে তথ্য খোঁজো। DuckDuckGo দিয়ে সার্চ করো।',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'সার্চ কোয়েরি' },
          max_results: { type: 'number', description: 'সর্বোচ্চ ফলাফল (ডিফল্ট: 5)' },
        },
        required: ['query'],
      },
      execute: async ({ query, max_results = 5 }) => {
        try {
          const encodedQuery = encodeURIComponent(query);
          const cmd = `curl -s -L --max-time 15 -A "Mozilla/5.0" "https://html.duckduckgo.com/html/?q=${encodedQuery}" 2>&1`;
          const { stdout } = await execAsync(cmd);
          const results: any[] = [];
          const linkRegex = /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)</g;
          let match;
          let count = 0;
          while ((match = linkRegex.exec(stdout)) !== null && count < max_results) {
            results.push({ url: match[1], title: match[2].trim() });
            count++;
          }
          return { success: true, query, results, count: results.length };
        } catch (error: any) { return { success: false, error: error.message, query }; }
      },
    });
  }

  private registerSystemTools(): void {
    this.register({
      name: 'system_info',
      description: 'সিস্টেমের তথ্য দেখো — CPU, RAM, ডিস্ক, OS, নেটওয়ার্ক।',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['all', 'cpu', 'memory', 'disk', 'network', 'os'], description: 'কোন তথ্য (ডিফল্ট: all)' },
        },
        required: [],
      },
      execute: async ({ type = 'all' }) => {
        try {
          const info: any = {};
          if (type === 'all' || type === 'os') {
            info.os = { platform: os.platform(), arch: os.arch(), hostname: os.hostname(), uptime: `${Math.floor(os.uptime() / 3600)} ঘণ্টা`, user: os.userInfo().username };
          }
          if (type === 'all' || type === 'memory') {
            const t = os.totalmem(), f = os.freemem();
            info.memory = { total: `${(t/1024/1024/1024).toFixed(2)} GB`, free: `${(f/1024/1024/1024).toFixed(2)} GB`, used: `${((t-f)/1024/1024/1024).toFixed(2)} GB`, usage: `${(((t-f)/t)*100).toFixed(1)}%` };
          }
          if (type === 'all' || type === 'cpu') {
            const cpus = os.cpus();
            info.cpu = { model: cpus[0]?.model ?? 'Unknown', cores: cpus.length, speed: `${cpus[0]?.speed ?? 0} MHz` };
          }
          if (type === 'all' || type === 'disk') {
            try {
              const { stdout } = await execAsync('df -h / 2>/dev/null | tail -1');
              const p = stdout.trim().split(/\s+/);
              info.disk = { total: p[1], used: p[2], free: p[3], usage: p[4] };
            } catch { info.disk = { error: 'তথ্য পাওয়া যায়নি' }; }
          }
          return { success: true, info };
        } catch (error: any) { return { success: false, error: error.message }; }
      },
    });

    this.register({
      name: 'process_list',
      description: 'চলমান প্রসেস দেখো বা নির্দিষ্ট প্রসেস খোঁজো।',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'প্রসেস নাম ফিল্টার (ঐচ্ছিক)' },
          top: { type: 'number', description: 'শীর্ষ N প্রসেস (ডিফল্ট: 10)' },
        },
        required: [],
      },
      execute: async ({ filter, top = 10 }) => {
        try {
          let cmd = filter ? `ps aux | grep -i "${filter}" | grep -v grep` : `ps aux --sort=-%cpu | head -${top + 1}`;
          const { stdout } = await execAsync(cmd);
          return { success: true, processes: stdout.trim() };
        } catch (error: any) { return { success: false, error: error.message }; }
      },
    });

    this.register({
      name: 'get_datetime',
      description: 'বর্তমান তারিখ ও সময় পাও।',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => {
        const now = new Date();
        return { success: true, iso: now.toISOString(), local: now.toLocaleString('bn-BD'), date: now.toLocaleDateString('bn-BD'), time: now.toLocaleTimeString('bn-BD'), timestamp: now.getTime() };
      },
    });
  }

  private registerMemoryTools(): void {
    const memoryFile = path.join(os.homedir(), '.nova', 'memory', 'tool_memory.json');
    const loadMemory = (): Record<string, string> => {
      try { if (fs.existsSync(memoryFile)) return JSON.parse(fs.readFileSync(memoryFile, 'utf8')); } catch { }
      return {};
    };
    const saveMemory = (data: Record<string, string>): void => {
      fs.mkdirSync(path.dirname(memoryFile), { recursive: true });
      fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2), 'utf8');
    };

    this.register({
      name: 'remember',
      description: 'কোনো গুরুত্বপূর্ণ তথ্য দীর্ঘমেয়াদীভাবে মনে রাখো।',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'মেমোরির চাবি/নাম' },
          value: { type: 'string', description: 'মনে রাখার তথ্য' },
        },
        required: ['key', 'value'],
      },
      execute: async ({ key, value }) => {
        const memory = loadMemory();
        memory[key] = value;
        saveMemory(memory);
        return { success: true, message: `"${key}" মনে রাখা হয়েছে।` };
      },
    });

    this.register({
      name: 'recall',
      description: 'আগে মনে রাখা তথ্য ফিরিয়ে আনো।',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'মেমোরির চাবি (খালি রাখলে সব দেখাবে)' },
        },
        required: [],
      },
      execute: async ({ key }) => {
        const memory = loadMemory();
        if (key) return { success: true, key, value: memory[key] ?? null };
        return { success: true, all_memories: memory, count: Object.keys(memory).length };
      },
    });
  }

  private registerBrowserTools(): void {
    const mcpCall = async (toolName: string, args: any): Promise<any> => {
      try {
        const input = JSON.stringify(args).replace(/'/g, "'\\''");
        const { stdout } = await execAsync(`manus-mcp-cli tool call ${toolName} --server playwright --input '${input}' 2>&1`, { timeout: 30000 });
        return { success: true, output: stdout.trim() };
      } catch (error: any) { return { success: false, error: error.message }; }
    };

    this.register({
      name: 'browser_navigate',
      description: 'ব্রাউজারে কোনো URL-এ যাও।',
      parameters: { type: 'object', properties: { url: { type: 'string', description: 'যাওয়ার URL' } }, required: ['url'] },
      execute: async ({ url }) => mcpCall('browser_navigate', { url }),
    });

    this.register({
      name: 'browser_snapshot',
      description: 'বর্তমান ব্রাউজার পেজের snapshot নাও।',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => mcpCall('browser_snapshot', {}),
    });

    this.register({
      name: 'browser_click',
      description: 'ব্রাউজারে কোনো উপাদানে ক্লিক করো।',
      parameters: {
        type: 'object',
        properties: {
          element: { type: 'string', description: 'ক্লিক করার উপাদানের বিবরণ' },
          ref: { type: 'string', description: 'উপাদানের reference ID' },
        },
        required: ['element'],
      },
      execute: async ({ element, ref }) => mcpCall('browser_click', { element, ref }),
    });

    this.register({
      name: 'browser_type',
      description: 'ব্রাউজারের ইনপুট ফিল্ডে টেক্সট টাইপ করো।',
      parameters: {
        type: 'object',
        properties: {
          element: { type: 'string', description: 'ইনপুট ফিল্ডের বিবরণ' },
          text: { type: 'string', description: 'টাইপ করার টেক্সট' },
          ref: { type: 'string', description: 'উপাদানের reference ID' },
        },
        required: ['element', 'text'],
      },
      execute: async ({ element, text, ref }) => mcpCall('browser_type', { element, text, ref }),
    });
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  getToolDefinitions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: { name: tool.name, description: tool.description, parameters: tool.parameters },
    }));
  }

  async execute(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) return { success: false, error: `টুল "${name}" পাওয়া যায়নি। উপলব্ধ: ${Array.from(this.tools.keys()).join(', ')}` };
    try { return await tool.execute(args); }
    catch (error: any) { return { success: false, error: `টুল "${name}" ব্যর্থ: ${error.message}` }; }
  }

  listTools(): string[] { return Array.from(this.tools.keys()); }
}
