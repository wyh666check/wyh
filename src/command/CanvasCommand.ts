import type { ArgumentList } from './ArgumentList';
import { CommandError } from '../shared/CommandError';
import { CommandResult } from './CommandResult';
import { Command } from './Command';
import type { CommandTarget } from './CommandTarget';
import { NumberText } from '../shared/NumberText';

/**
 * `canvas [w] [h]`：无参数显示画布尺寸，带参数修改尺寸。
 *
 * 修改尺寸属于文档类操作（规范 4.3），因此同样锁住 undo/redo。
 */
export class CanvasCommand extends Command {
  constructor(
    private readonly size: { readonly width: number; readonly height: number } | null,
  ) {
    super();
  }

  static fromArguments(argv: ArgumentList): CanvasCommand {
    const usage = 'canvas [w] [h]';
    if (argv.length === 0) return new CanvasCommand(null);
    if (argv.length !== 2) throw new CommandError(`usage: ${usage}`);
    return new CanvasCommand({
      width: argv.requireNumber(0, usage),
      height: argv.requireNumber(1, usage),
    });
  }

  override execute(target: CommandTarget): CommandResult {
    const document = target.requireDocument();
    if (this.size === null) {
      return CommandResult.of(
        `canvas ${NumberText.format(document.width)}x${NumberText.format(document.height)}`,
      );
    }
    document.resize(this.size.width, this.size.height);
    target.history.lock();
    return CommandResult.of(
      `canvas resized to ${NumberText.format(this.size.width)}x${NumberText.format(this.size.height)}`,
    );
  }
}
