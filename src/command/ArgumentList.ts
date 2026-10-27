import { CommandError } from '../shared/CommandError';
import { NumberText } from '../shared/NumberText';
import { Token } from './Token';

/**
 * 命令参数视图：把"取必填参数 / 取数字 / 取尾部自由文本 / 找 `in` 子句"收敛成一组方法，
 * 让每条命令的 `fromArguments` 只表达语法本身。
 */
export class ArgumentList {
  constructor(private readonly tokens: ReadonlyArray<Token>) {}

  get length(): number {
    return this.tokens.length;
  }

  tokenAt(index: number): Token | undefined {
    return this.tokens[index];
  }

  valueAt(index: number): string | undefined {
    return this.tokens[index]?.value;
  }

  require(index: number, usage: string): string {
    const value = this.valueAt(index);
    if (value === undefined) throw new CommandError(`usage: ${usage}`);
    return value;
  }

  requireNumber(index: number, usage: string): number {
    return NumberText.parse(this.require(index, usage));
  }

  valuesBetween(from: number, to: number): string[] {
    return this.tokens.slice(from, to).map((token) => token.value);
  }

  restFrom(from: number): string[] {
    return this.valuesBetween(from, this.tokens.length);
  }

  joinedFrom(from: number): string {
    return this.restFrom(from).join(' ');
  }

  ensureLength(min: number, max: number, usage: string): void {
    if (this.length < min || this.length > max) throw new CommandError(`usage: ${usage}`);
  }

  /** 查找未加引号的关键字（如 `create … in <gid>` 的 `in`），未找到返回 -1。 */
  indexOfKeyword(keyword: string, from: number): number {
    for (let index = from; index < this.tokens.length; index += 1) {
      const token = this.tokens[index];
      if (token !== undefined && !token.quoted && token.value === keyword) return index;
    }
    return -1;
  }
}
