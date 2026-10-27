import { CommandError } from './CommandError';

/**
 * 数字的解析与显示。
 *
 * 显示规则（决定 `tree` / `show` / 回显的一致性）：整数不带小数点，
 * 浮点最多 6 位小数并去掉尾随 0。几何运算产生的浮点漂移（如 30.000000000000004）
 * 因此不会泄漏到界面与文件里。
 */
export class NumberText {
  private constructor() {}

  /** 解析命令行参数：必须是完整数字，`12px` 这类带单位写法在这里非法。 */
  static parse(raw: string): number {
    const text = raw.trim();
    if (text === '') throw new CommandError('invalid number: (empty)');
    const value = Number(text);
    if (!Number.isFinite(value)) throw new CommandError(`invalid number: ${raw}`);
    return value;
  }

  /** 宽松解析：用于读外部 SVG（允许 `px` 单位、允许前后空白），失败返回 null 由调用方回退。 */
  static parseQuantity(raw: string): number | null {
    const match = /^\s*(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\s*(?:px)?\s*$/.exec(raw);
    if (match === null) return null;
    const text = match[1];
    if (text === undefined) return null;
    const value = Number(text);
    return Number.isFinite(value) ? value : null;
  }

  static format(value: number): string {
    if (!Number.isFinite(value)) throw new CommandError('cannot display a non-finite number');
    const rounded = Math.round(value * 1e6) / 1e6;
    if (Number.isInteger(rounded)) return String(rounded);
    return rounded.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  }
}
