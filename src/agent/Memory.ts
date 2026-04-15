import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
  timestamp?: number;
}

export interface MemoryEntry {
  key: string;
  value: string;
  timestamp: number;
}

export class Memory {
  private conversationHistory: Message[] = [];
  private longTermMemory: Map<string, MemoryEntry> = new Map();
  private memoryDir: string;
  private memoryFile: string;
  private conversationFile: string;
  private maxHistoryLength: number;

  constructor(maxHistoryLength: number = 50) {
    this.maxHistoryLength = maxHistoryLength;
    this.memoryDir = path.join(os.homedir(), '.nova', 'memory');
    this.memoryFile = path.join(this.memoryDir, 'long_term.json');
    this.conversationFile = path.join(this.memoryDir, 'conversation.json');
    this.ensureMemoryDir();
    this.loadFromDisk();
  }

  private ensureMemoryDir(): void {
    fs.mkdirSync(this.memoryDir, { recursive: true });
  }

  private loadFromDisk(): void {
    // Long-term memory লোড করো
    if (fs.existsSync(this.memoryFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
        for (const entry of data) {
          this.longTermMemory.set(entry.key, entry);
        }
      } catch {
        // ফাইল corrupt হলে নতুন শুরু করো
      }
    }

    // আগের কথোপকথন লোড করো (শেষ ২০টি)
    if (fs.existsSync(this.conversationFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.conversationFile, 'utf8'));
        this.conversationHistory = data.slice(-20);
      } catch {
        this.conversationHistory = [];
      }
    }
  }

  private saveToDisk(): void {
    try {
      // Long-term memory সেভ করো
      const memoryArray = Array.from(this.longTermMemory.values());
      fs.writeFileSync(this.memoryFile, JSON.stringify(memoryArray, null, 2), 'utf8');

      // কথোপকথন সেভ করো (শেষ ৫০টি)
      const recent = this.conversationHistory.slice(-50);
      fs.writeFileSync(this.conversationFile, JSON.stringify(recent, null, 2), 'utf8');
    } catch {
      // সেভ ব্যর্থ হলে চালিয়ে যাও
    }
  }

  // কথোপকথনে নতুন মেসেজ যোগ করো
  addMessage(message: Message): void {
    message.timestamp = Date.now();
    this.conversationHistory.push(message);

    // সীমা অতিক্রম করলে পুরনো মেসেজ সরাও (system prompt রাখো)
    if (this.conversationHistory.length > this.maxHistoryLength) {
      const systemMessages = this.conversationHistory.filter(m => m.role === 'system');
      const nonSystemMessages = this.conversationHistory.filter(m => m.role !== 'system');
      const trimmed = nonSystemMessages.slice(-(this.maxHistoryLength - systemMessages.length));
      this.conversationHistory = [...systemMessages, ...trimmed];
    }

    this.saveToDisk();
  }

  // সম্পূর্ণ কথোপকথন ইতিহাস পাও
  getHistory(): Message[] {
    return this.conversationHistory;
  }

  // কথোপকথন রিসেট করো (system prompt রাখো)
  resetConversation(): void {
    const systemMessages = this.conversationHistory.filter(m => m.role === 'system');
    this.conversationHistory = systemMessages;
    this.saveToDisk();
  }

  // দীর্ঘমেয়াদী মেমোরিতে কিছু মনে রাখো
  remember(key: string, value: string): void {
    this.longTermMemory.set(key, {
      key,
      value,
      timestamp: Date.now(),
    });
    this.saveToDisk();
  }

  // দীর্ঘমেয়াদী মেমোরি থেকে মনে করো
  recall(key: string): string | null {
    const entry = this.longTermMemory.get(key);
    return entry ? entry.value : null;
  }

  // সব মেমোরি এন্ট্রি দেখো
  listMemories(): MemoryEntry[] {
    return Array.from(this.longTermMemory.values());
  }

  // মেমোরি থেকে মুছে ফেলো
  forget(key: string): boolean {
    const deleted = this.longTermMemory.delete(key);
    if (deleted) this.saveToDisk();
    return deleted;
  }

  // কথোপকথনের সারসংক্ষেপ
  getSummary(): string {
    const count = this.conversationHistory.filter(m => m.role !== 'system').length;
    const memories = this.longTermMemory.size;
    return `কথোপকথন: ${count} মেসেজ | দীর্ঘমেয়াদী মেমোরি: ${memories} এন্ট্রি`;
  }
}
