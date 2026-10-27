import type { ArgumentList } from './ArgumentList';
import type { CommandCategory } from './CommandCategory';
import { CommandError } from '../shared/CommandError';
import { CommandResult } from './CommandResult';
import { Command } from './Command';
import type { CommandRegistry } from './CommandRegistry';

/**
 * `help`：列出全部命令与语法。
 *
 * 帮助文本**从注册表生成**而不是硬编码一份：新增命令时只要注册就自动出现在 help 里，
 * 不会出现"文档说支持、实际不支持"的漂移。
 */
export class HelpCommand extends Command {
  private static readonly GROUPS: ReadonlyArray<readonly [CommandCategory, string]> = [
    ['document', 'document (io, 执行后 undo/redo 禁止)'],
    ['edit', 'edit (可 undo/redo，一条命令一个单元)'],
    ['query', 'query (不改变状态)'],
    ['history', 'history'],
  ];

  constructor(private readonly registry: CommandRegistry) {
    super();
  }

  static create(argv: ArgumentList, registry: CommandRegistry): HelpCommand {
    if (argv.length !== 0) throw new CommandError('usage: help');
    return new HelpCommand(registry);
  }

  override execute(): CommandResult {
    const specs = this.registry.list();
    const width = specs.reduce((max, spec) => Math.max(max, spec.syntax.length), 0);
    const lines: string[] = ['available commands', ''];

    for (const [category, title] of HelpCommand.GROUPS) {
      const group = specs.filter((spec) => spec.category === category);
      if (group.length === 0) continue;
      lines.push(title);
      for (const spec of group) {
        lines.push(`  ${spec.syntax.padEnd(width)}  ${spec.summary}`);
      }
      lines.push('');
    }

    lines.push('以 # 开头的整行为注释；可把命令序列存成脚本，从标准输入回放。');
    return CommandResult.from(lines);
  }
}
