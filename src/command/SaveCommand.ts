import type { ArgumentList } from './ArgumentList';
import { CommandError } from '../shared/CommandError';
import { CommandResult } from './CommandResult';
import { Command } from './Command';
import type { CommandTarget } from './CommandTarget';
import type { SvgDocumentStore } from '../svgio/SvgDocumentStore';

/**
 * `save [file.svg]`：保存当前文档；无参数时保存到读入/上次保存的路径。
 *
 * 保存成功后 `history.lock()`：按规范 4.3，文档类命令之后 undo/redo 禁止，
 * 直到下一次编辑命令重新解禁（由 `History.push` 解禁）。
 */
export class SaveCommand extends Command {
  constructor(
    private readonly path: string | null,
    private readonly store: SvgDocumentStore,
  ) {
    super();
  }

  static fromArguments(argv: ArgumentList, store: SvgDocumentStore): SaveCommand {
    const usage = 'save [file.svg]';
    argv.ensureLength(0, 1, usage);
    return new SaveCommand(argv.valueAt(0) ?? null, store);
  }

  override execute(target: CommandTarget): CommandResult {
    const document = target.requireDocument();
    const path = this.path ?? target.sourcePath;
    if (path === null) {
      throw new CommandError('no file path: use save <file.svg>');
    }
    this.store.write(document, path);
    target.rememberPath(path);
    target.history.lock();
    return CommandResult.of(`saved to ${path} (${String(document.count())} elements)`);
  }
}
