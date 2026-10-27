import type { ArgumentList } from './ArgumentList';
import { CommandError } from '../shared/CommandError';
import { CommandResult } from './CommandResult';
import type { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { EditCommand } from './EditCommand';
import { Group } from '../domain/Group';
import type { Shape } from '../domain/Shape';

interface GroupMember {
  readonly shape: Shape;
  readonly parent: Container;
  readonly index: number;
}

/**
 * `group <newGid> <id1> <id2>…`：新建容器并收编已存在的图形。
 *
 * 一个命令 = 一个 undo 单元：`members` 里保存了每个成员的原父容器与原下标，
 * undo 时按**下标升序**插回，即可精确还原 z-order（先插低位、后插高位，
 * 每次插入的下标在重建后的列表里都成立）。
 *
 * `prepare` 里的祖先冲突检查（`cannot group a container into its own descendant`）
 * 不只是防呆：把某容器与其子孙放进同一个新容器会造出环，之后任何遍历都会死循环。
 */
export class GroupShapesCommand extends EditCommand {
  private group: Group | null = null;
  private homeParent: Container | null = null;
  private readonly members: GroupMember[] = [];

  constructor(
    private readonly newId: string,
    private readonly ids: ReadonlyArray<string>,
  ) {
    super();
  }

  static fromArguments(argv: ArgumentList): GroupShapesCommand {
    const usage = 'group <newGid> <id1> <id2>...';
    if (argv.length < 3) throw new CommandError(`usage: ${usage}`);
    return new GroupShapesCommand(argv.require(0, usage), argv.restFrom(1));
  }

  protected override prepare(document: Document): void {
    if (document.find(this.newId) !== undefined) {
      throw new CommandError(`id already exists: ${this.newId}`);
    }

    const shapes: Shape[] = [];
    for (const id of this.ids) {
      const shape = document.require(id);
      if (shapes.includes(shape)) throw new CommandError(`duplicate shape in group: ${id}`);
      shapes.push(shape);
    }

    for (const candidate of shapes) {
      for (const other of shapes) {
        if (candidate !== other && candidate.isAncestorOf(other)) {
          throw new CommandError(`cannot group a container into its own descendant: ${candidate.id}`);
        }
      }
    }

    for (const shape of shapes) {
      const parent = shape.parent;
      if (parent === null) throw new Error(`shape ${shape.id} is not attached to any container`);
      this.members.push({ shape, parent, index: parent.indexOf(shape) });
    }
    this.homeParent = this.members[0]?.parent ?? null;
  }

  protected override apply(): CommandResult {
    const home = this.requireHome();
    const first = this.members[0];
    if (first === undefined) throw new Error('group command has no members');

    const group = new Group(this.newId);
    this.group = group;
    home.insertAt(group, first.index);
    for (const member of this.members) group.append(member.shape);

    return CommandResult.of(`${group.label} created with ${this.members.length} children`);
  }

  protected override revert(): CommandResult {
    const group = this.requireGroup();
    this.requireHome().detach(group);

    const ordered = [...this.members].sort((left, right) => left.index - right.index);
    for (const member of ordered) member.parent.insertAt(member.shape, member.index);

    return CommandResult.of(`${group.label} ungrouped (${this.members.length} children)`);
  }

  private requireGroup(): Group {
    if (this.group === null) throw new Error('group command used before apply');
    return this.group;
  }

  private requireHome(): Container {
    if (this.homeParent === null) throw new Error('group command used before prepare');
    return this.homeParent;
  }
}
