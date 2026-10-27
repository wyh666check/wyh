import { CommandError } from '../shared/CommandError';
import type { CommandResult } from './CommandResult';
import type { Document } from '../domain/Document';
import type { EditCommand } from './EditCommand';

/**
 * 撤销 / 重做栈。
 *
 * 三条与规范强相关的规则都在这里收口：
 * 1. **一条编辑命令 = 一个 undo 单元**：栈里只放 EditCommand，`group` 这类多目标命令
 *    本身是一个对象，所以 undo 一次即整体还原；
 * 2. **undo 后若有新编辑，redo 栈清空**：`push` 时无条件清空 redo 栈；
 * 3. **文档类命令后 undo/redo 禁止**：`lock()` 置位，直到下一次编辑命令（`push`）解禁。
 */
export class History {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  private locked = false;

  get undoDepth(): number {
    return this.undoStack.length;
  }

  get redoDepth(): number {
    return this.redoStack.length;
  }

  get isLocked(): boolean {
    return this.locked;
  }

  push(command: EditCommand): void {
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.locked = false;
  }

  lock(): void {
    this.locked = true;
  }

  /** init / read 换掉了整份文档，旧命令引用的图形已经不在树上，必须整体丢弃。 */
  reset(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.locked = false;
  }

  undo(document: Document): CommandResult {
    this.guard('undo');
    const command = this.top(this.undoStack);
    if (command === undefined) throw new CommandError('nothing to undo');
    const result = command.rollback(document);
    this.undoStack.pop();
    this.redoStack.push(command);
    return result;
  }

  redo(document: Document): CommandResult {
    this.guard('redo');
    const command = this.top(this.redoStack);
    if (command === undefined) throw new CommandError('nothing to redo');
    const result = command.replay(document);
    this.redoStack.pop();
    this.undoStack.push(command);
    return result;
  }

  private guard(action: string): void {
    if (this.locked) throw new CommandError(`${action} not allowed after io command`);
  }

  private top(stack: ReadonlyArray<EditCommand>): EditCommand | undefined {
    return stack[stack.length - 1];
  }
}
