import type { CommandResult } from './CommandResult';
import type { CommandTarget } from './CommandTarget';
import { Command } from './Command';
import type { Document } from '../domain/Document';

/**
 * 编辑命令（可撤销）的模板方法骨架。
 *
 * 固定的执行骨架是 `prepare → apply → 入栈`：
 * - `prepare` 只做**校验与快照**，绝不变更状态，因此校验失败时文档必然未被污染；
 * - `apply` 认为"前置条件已成立"，只做变更并返回回显；
 * - `rollback` / `replay` 分别服务 undo / redo，二者都复用 `prepare` 阶段拍下的快照，
 *   因此"一条命令 = 一个 undo 单元"是结构上保证的，而不是靠调用方小心。
 *
 * 快照有两种形态，由子类按需选用：
 * - 参数逆运算（`move` / `scale`）——没有状态需要保存；
 * - 结构快照（`delete` / `group` / `ungroup` / `addto` / 层级调整）——保存父容器与下标。
 */
export abstract class EditCommand extends Command {
  private prepared = false;

  override execute(target: CommandTarget): CommandResult {
    const document = target.requireDocument();
    if (!this.prepared) {
      this.prepare(document);
      this.prepared = true;
    }
    const result = this.apply(document);
    target.history.push(this);
    return result;
  }

  /** redo：重新施加同一份变更。 */
  replay(document: Document): CommandResult {
    return this.apply(document);
  }

  /** undo：撤销变更。 */
  rollback(document: Document): CommandResult {
    return this.revert(document);
  }

  /** 校验 + 拍快照；只读。 */
  protected prepare(_document: Document): void {}

  protected abstract apply(document: Document): CommandResult;

  protected abstract revert(document: Document): CommandResult;
}
