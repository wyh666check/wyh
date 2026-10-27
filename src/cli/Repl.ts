import { createInterface } from 'node:readline';

import type { CommandShell } from './CommandShell';

/**
 * REPL：只负责"提示符、读行、写行"。
 *
 * 交互式（TTY）下打印 `svg>` 提示符并在每段输出后空一行；从管道读入时
 * 不打印提示符，输出保持紧凑——这样 `cat script.txt | npm run cli` 的行为
 * 与手工敲完全一致，也便于把 transcript 做成回归测试。
 */
export class Repl {
  constructor(private readonly shell: CommandShell) {}

  async run(): Promise<void> {
    const interactive = process.stdin.isTTY === true;
    process.stdout.write("svg-editor 0.1 — type 'help' for commands\n");

    const reader = createInterface(
      interactive
        ? { input: process.stdin, output: process.stdout, terminal: true, prompt: 'svg> ' }
        : { input: process.stdin, terminal: false },
    );

    if (interactive) reader.prompt();
    for await (const line of reader) {
      const lines = this.shell.handleLine(line);
      if (lines.length > 0) {
        process.stdout.write(`${lines.join('\n')}\n`);
        if (interactive) process.stdout.write('\n');
      }
      if (interactive) reader.prompt();
    }
  }
}
