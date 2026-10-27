import type { ArgumentList } from './ArgumentList';
import { CommandResult } from './CommandResult';
import { Command } from './Command';
import type { CommandTarget } from './CommandTarget';
import { ShapeDetailRenderer } from '../presentation/ShapeDetailRenderer';

/** `show <id>`：单个图形的属性明细（显示类命令，不进 undo 栈）。 */
export class ShowCommand extends Command {
  constructor(private readonly id: string) {
    super();
  }

  static fromArguments(argv: ArgumentList): ShowCommand {
    const usage = 'show <id>';
    argv.ensureLength(1, 1, usage);
    return new ShowCommand(argv.require(0, usage));
  }

  override execute(target: CommandTarget): CommandResult {
    const document = target.requireDocument();
    return CommandResult.from(new ShapeDetailRenderer().render(document.require(this.id)));
  }
}
