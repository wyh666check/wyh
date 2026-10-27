/**
 * 全部"可预期错误"的根类型。
 *
 * 只有 CommandError 会被 REPL 以 `error: <message>` 的形式回显给用户；
 * 其余 AppError 子类代表内部契约被破坏，属于缺陷而不是用户输入问题。
 */
export abstract class AppError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
