import type { CommandResult } from './CommandResult';
import type { CommandTarget } from './CommandTarget';

/**
 * 命令模式（Command）的 Command 角色。
 *
 * 所有用户输入最终都被解析成一个 Command 对象再执行：解析与执行分离，
 * 于是"报错时不改变任何状态"这条约定只需在 `execute` 里保证一次。
 */
export abstract class Command {
  abstract execute(target: CommandTarget): CommandResult;
}
