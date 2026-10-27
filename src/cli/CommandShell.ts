import { ArgumentList } from '../command/ArgumentList';
import { CommandError } from '../shared/CommandError';
import type { CommandRegistry } from '../command/CommandRegistry';
import type { CommandTarget } from '../command/CommandTarget';
import { CommandTokenizer } from '../command/CommandTokenizer';

/**
 * 一行的入口：切词 → 查表 → 构造 Command → 执行。
 *
 * 这一层只做"把文本变成命令对象"和"把错误变成一行 `error:` 文本"，
 * 不包含任何业务判断——所以它能被测试直接驱动（`handleLine` 返回字符串数组，
 * 完全不碰 stdout）。
 */
export class CommandShell {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly target: CommandTarget,
    private readonly tokenizer: CommandTokenizer = new CommandTokenizer(),
  ) {}

  /** 整行注释：`#` 只在行首（允许前导空白）成立，这样 `#ffffff` 仍是颜色值。 */
  static isComment(line: string): boolean {
    return line.trimStart().startsWith('#');
  }

  handleLine(line: string): string[] {
    if (CommandShell.isComment(line)) return [];

    try {
      const tokens = this.tokenizer.tokenize(line);
      if (tokens.length === 0) return [];

      const name = tokens[0]?.value ?? '';
      const spec = this.registry.find(name);
      if (spec === undefined) {
        throw new CommandError(`unknown command: ${name} (type 'help' for commands)`);
      }

      const command = spec.build(new ArgumentList(tokens.slice(1)));
      return [...command.execute(this.target).lines];
    } catch (error) {
      if (error instanceof CommandError) return [`error: ${error.message}`];
      throw error;
    }
  }
}
