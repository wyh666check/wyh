import { CommandError } from './CommandError';
import { NumberText } from './NumberText';

/**
 * 命令参数列表的一层薄包装。
 *
 * 存在的意义：把"参数不够/类型不对 → `usage: …`"这套判断收敛到一处，
 * 避免每条命令各自写一套 if 并产生不一致的错误文案。
 */
export class Arguments {
  constructor(private readonly values: ReadonlyArray<string>) {}

  static of(values: ReadonlyArray<string>): Arguments {
    return new Arguments(values);
  }

  get length(): number {
    return this.values.length;
  }

  at(index: number): string | undefined {
    return this.values[index];
  }

  /** 取必填参数，缺失即 usage 错误。 */
  require(index: number, usage: string): string {
    const value = this.values[index];
    if (value === undefined) throw new CommandError(`usage: ${usage}`);
    return value;
  }

  number(index: number, usage: string): number {
    return NumberText.parse(this.require(index, usage));
  }

  /** 从 index 起的所有参数按空格拼回（用于 `set <id> text "..."` 这类尾部自由文本）。 */
  restFrom(index: number): string[] {
    return this.values.slice(index);
  }

  joinedFrom(index: number): string {
    return this.restFrom(index).join(' ');
  }

  ensureLength(min: number, max: number, usage: string): void {
    if (this.values.length < min || this.values.length > max) {
      throw new CommandError(`usage: ${usage}`);
    }
  }
}
