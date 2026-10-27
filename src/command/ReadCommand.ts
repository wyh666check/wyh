import type { ArgumentList } from './ArgumentList';
import { CommandResult } from './CommandResult';
import { Command } from './Command';
import type { CommandTarget } from './CommandTarget';
import type { SvgDocumentStore } from '../svgio/SvgDocumentStore';

/**
 * `read <file.svg>`：读入 SVG 文件为当前文档。
 *
 * 顺序很关键：**先完整读入、再替换文档**。读入失败时当前文档与历史栈都不受影响，
 * 符合"命令失败不改变任何状态"的约定；读入成功则旧历史整体失效（`replaceDocument` 负责）。
 * 补 id 之类的告警排在摘要行之前，与规范 transcript 一致。
 */
export class ReadCommand extends Command {
  constructor(
    private readonly path: string,
    private readonly store: SvgDocumentStore,
  ) {
    super();
  }

  static fromArguments(argv: ArgumentList, store: SvgDocumentStore): ReadCommand {
    const usage = 'read <file.svg>';
    argv.ensureLength(1, 1, usage);
    return new ReadCommand(argv.require(0, usage), store);
  }

  override execute(target: CommandTarget): CommandResult {
    const result = this.store.read(this.path);
    target.replaceDocument(result.document, this.path);
    return CommandResult.from([
      ...result.warnings,
      `read ${this.path} (${String(result.document.count())} elements)`,
    ]);
  }
}
