export class Logger {
  constructor(private context: string) {}

  info(message: string) {
    console.log(`[INFO] [${this.context}] ${message}`);
  }

  error(message: string, error?: any) {
    console.error(`[ERROR] [${this.context}] ${message}`, error);
  }
}
