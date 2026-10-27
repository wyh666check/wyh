import type { ArgumentList } from './ArgumentList';
import { CommandResult } from './CommandResult';
import { Command } from './Command';
import type { CommandTarget } from './CommandTarget';
import { Document } from '../domain/Document';
import { TreeRenderer } from '../presentation/TreeRenderer';

/**
 * `tree [id]`：结构树（默认全文档，带 id 时只显示该子树）。
 *
 * 显示类命令：不进 undo 栈，也不改变任何状态。
 * `tree svg` 视为查看整份文档——根容器不可寻址（`find` 不返回它），
 * 但用户显然会想用 `svg` 这个名字看全树。
 */
export class TreeCommand extends Command {
  constructor(private readonly id: string | null) {
    super();
  }

  static fromArguments(argv: ArgumentList): TreeCommand {
    argv.ensureLength(0, 1, 'tree [id]');
    return new TreeCommand(argv.valueAt(0) ?? null);
  }

  override execute(target: CommandTarget): CommandResult {
    const document = target.requireDocument();
    const renderer = new TreeRenderer();
    if (this.id === null || this.id === Document.ROOT_ID) {
      return CommandResult.from(renderer.render(document));
    }
    return CommandResult.from(renderer.renderSubtree(document.require(this.id)));
  }
}
