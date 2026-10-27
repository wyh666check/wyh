import type { ArgumentList } from './ArgumentList';
import { CommandError } from '../shared/CommandError';
import type { CommandResult } from './CommandResult';
import { Command } from './Command';
import type { CommandTarget } from './CommandTarget';

/**
 * `redo`：重做被 undo 的编辑。
 *
 * 与 `undo` 对称，也是一条普通 Command；`undo` 之后若发生新编辑，
 * `History.push` 会清空 redo 栈，因此这里只会拿到仍然有效的那条命令。
 */
export class RedoCommand extends Command {
  static fromArguments(argv: ArgumentList): RedoCommand {
    if (argv.length !== 0) throw new CommandError('usage: redo');
    return new RedoCommand();
  }

  override execute(target: CommandTarget): CommandResult {
    return target.history.redo(target.requireDocument());
  }
}
