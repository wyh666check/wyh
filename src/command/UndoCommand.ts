import type { ArgumentList } from './ArgumentList';
import { CommandError } from '../shared/CommandError';
import type { CommandResult } from './CommandResult';
import { Command } from './Command';
import type { CommandTarget } from './CommandTarget';

/**
 * `undo`：撤销上一次编辑命令。
 *
 * 它自己也是一条 Command（因此命令分发不需要为它开特例），但不进 undo 栈；
 * 真正的"能不能撤销"由 `History` 判断并给出 `undo not allowed after io command` 等文案。
 */
export class UndoCommand extends Command {
  static fromArguments(argv: ArgumentList): UndoCommand {
    if (argv.length !== 0) throw new CommandError('usage: undo');
    return new UndoCommand();
  }

  override execute(target: CommandTarget): CommandResult {
    return target.history.undo(target.requireDocument());
  }
}
