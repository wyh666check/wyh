/** 一条命令执行后的输出行；命令本身不接触 stdout，便于测试与后续接入其它前端。 */
export class CommandResult {
  private constructor(readonly lines: ReadonlyArray<string>) {}

  static of(...lines: string[]): CommandResult {
    return new CommandResult(lines);
  }

  static from(lines: ReadonlyArray<string>): CommandResult {
    return new CommandResult(lines);
  }

  static empty(): CommandResult {
    return new CommandResult([]);
  }
}
