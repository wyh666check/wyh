import { CommandError } from '../shared/CommandError';
import { Container } from './Container';

/** 分组容器 `<g>`：纯结构节点，本身没有几何与样式。 */
export class Group extends Container {
  override readonly typeName = 'g';

  constructor(id: string) {
    super(id);
  }

  static fromArguments(id: string, args: ReadonlyArray<string>): Group {
    if (args.length !== 0) throw new CommandError('usage: create g <id>');
    return new Group(id);
  }
}
