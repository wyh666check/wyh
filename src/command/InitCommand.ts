import { CommandError } from '../shared/CommandError';
import { CommandResult } from './CommandResult';
import { Command } from './Command';
import type { CommandTarget } from './CommandTarget';
import { Document } from '../domain/Document';
import { NumberText } from '../shared/NumberText';
import type { ArgumentList } from './ArgumentList';

/**
 * `init [w] [h]`：新建空画布，作为当前文档。
 *
 * 换文档意味着旧命令引用的图形全部失效，因此 `replaceDocument` 会顺带清空历史栈。
 */
export class InitCommand extends Command {
  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    super();
  }

  static fromArguments(argv: ArgumentList): InitCommand {
    const usage = 'init [w] [h]';
    if (argv.length === 0) return new InitCommand(800, 600);
    if (argv.length !== 2) throw new CommandError(`usage: ${usage}`);
    return new InitCommand(argv.requireNumber(0, usage), argv.requireNumber(1, usage));
  }

  override execute(target: CommandTarget): CommandResult {
    target.replaceDocument(new Document(this.width, this.height), null);
    return CommandResult.of(
      `canvas ${NumberText.format(this.width)}x${NumberText.format(this.height)} created`,
    );
  }
}
