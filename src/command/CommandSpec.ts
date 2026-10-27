import type { ArgumentList } from './ArgumentList';
import type { Command } from './Command';
import type { CommandCategory } from './CommandCategory';

/**
 * 一条命令的注册表项：名字、分类、语法、摘要，以及"把参数变成 Command 对象"的构造器。
 *
 * 这是规范允许的**按名字分派**两处之一（命令名 → 实现）。分派发生在这里，
 * 而不是散落在 REPL 的 if/else 里；`help` 也直接复用它，不会与实际能力脱节。
 */
export class CommandSpec {
  constructor(
    readonly name: string,
    readonly category: CommandCategory,
    readonly syntax: string,
    readonly summary: string,
    private readonly builder: (argv: ArgumentList) => Command,
  ) {}

  build(argv: ArgumentList): Command {
    return this.builder(argv);
  }
}
