const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', cyan: '\x1b[36m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  blue: '\x1b[34m', magenta: '\x1b[35m', gray: '\x1b[90m',
};

export class Logger {
  private debugMode: boolean;
  constructor(private context: string) {
    this.debugMode = process.env.NOVA_DEBUG === 'true';
  }
  private ts(): string { return new Date().toLocaleTimeString('en-GB', { hour12: false }); }
  private fmt(level: string, color: string, msg: string): string {
    return `${colors.gray}[${this.ts()}]${colors.reset} ${color}${colors.bright}[${level}]${colors.reset} ${colors.cyan}[${this.context}]${colors.reset} ${msg}`;
  }
  info(message: string): void { console.log(this.fmt('INFO', colors.green, message)); }
  error(message: string, error?: any): void {
    console.error(this.fmt('ERROR', colors.red, message));
    if (error && this.debugMode) console.error(`${colors.red}  ${error.stack || error.message}${colors.reset}`);
  }
  warn(message: string): void { console.warn(this.fmt('WARN', colors.yellow, message)); }
  debug(message: string): void { if (this.debugMode) console.log(this.fmt('DEBUG', colors.gray, message)); }
  tool(toolName: string, args?: any): void {
    const a = args ? ` ${colors.gray}${JSON.stringify(args).slice(0, 80)}${colors.reset}` : '';
    console.log(this.fmt('TOOL', colors.magenta, `\u2699 ${colors.bright}${toolName}${colors.reset}${a}`));
  }
  nova(message: string): void { console.log(`\n${colors.cyan}${colors.bright}Nova:${colors.reset} ${message}\n`); }
  user(message: string): void { console.log(`${colors.blue}${colors.bright}You:${colors.reset} ${message}`); }
  separator(): void { console.log(`${colors.gray}${'\u2500'.repeat(60)}${colors.reset}`); }
  success(message: string): void { console.log(`${colors.green}\u2713 ${message}${colors.reset}`); }
}
