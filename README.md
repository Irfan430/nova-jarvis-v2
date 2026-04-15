# Nova Jarvis V2

A modern, LLM-driven OS control agent designed to be flexible and powerful.

## Features
- **LLM-First Architecture**: Decisions are made by the LLM, not hardcoded rules.
- **Tool-Based Execution**: Extensible tool registry for browser, shell, and OS operations.
- **Bangla Support**: Native support for Bangla and English inputs.

## Getting Started
1. Install dependencies: `npm install`
2. Set up environment variables: `OPENAI_API_KEY` and `OPENROUTER_API_KEY`.
3. Run the agent: `npm start`

## Project Structure
- `src/agent`: Core agent logic and control loop.
- `src/tools`: Tool definitions and registry.
- `src/runtime`: Environment and execution management.
- `src/utils`: Shared utilities and logging.
