import { AttributeView } from './AttributeView';
import { CommandError } from '../shared/CommandError';
import { NumberText } from '../shared/NumberText';

/**
 * 图形的外观（fill / stroke / stroke-width）。
 *
 * 三个**固定字段**而不是任意字符串键的字典——"贫血数据袋"被规范明确禁止，
 * 外观就是这三个有类型的值，缺省即"未写入该属性"，交给 SVG 渲染默认值处理。
 */
export class Paint {
  private static readonly NAMES: ReadonlyArray<string> = ['fill', 'stroke', 'stroke-width'];

  private fillValue: string | undefined;
  private strokeValue: string | undefined;
  private strokeWidthValue: number | undefined;

  get fill(): string | undefined {
    return this.fillValue;
  }

  get stroke(): string | undefined {
    return this.strokeValue;
  }

  get strokeWidth(): number | undefined {
    return this.strokeWidthValue;
  }

  static accepts(name: string): boolean {
    return Paint.NAMES.includes(name);
  }

  read(name: string): string | undefined {
    switch (name) {
      case 'fill':
        return this.fillValue;
      case 'stroke':
        return this.strokeValue;
      case 'stroke-width':
        return this.strokeWidthValue === undefined
          ? undefined
          : NumberText.format(this.strokeWidthValue);
      default:
        return undefined;
    }
  }

  write(name: string, raw: string): void {
    switch (name) {
      case 'fill':
        this.fillValue = Paint.requirePaint(raw, name);
        return;
      case 'stroke':
        this.strokeValue = Paint.requirePaint(raw, name);
        return;
      case 'stroke-width': {
        const value = NumberText.parse(raw);
        if (value < 0) throw new CommandError('stroke-width must not be negative');
        this.strokeWidthValue = value;
        return;
      }
      default:
        throw new CommandError(`unknown attribute: ${name}`);
    }
  }

  clear(name: string): void {
    switch (name) {
      case 'fill':
        this.fillValue = undefined;
        return;
      case 'stroke':
        this.strokeValue = undefined;
        return;
      case 'stroke-width':
        this.strokeWidthValue = undefined;
        return;
      default:
        throw new CommandError(`unknown attribute: ${name}`);
    }
  }

  /** 仅输出"确实存在"的属性，避免把 SVG 默认值固化进文件。 */
  views(): AttributeView[] {
    const views: AttributeView[] = [];
    if (this.fillValue !== undefined) views.push(AttributeView.style('fill', this.fillValue));
    if (this.strokeValue !== undefined) views.push(AttributeView.style('stroke', this.strokeValue));
    if (this.strokeWidthValue !== undefined) {
      views.push(AttributeView.style('stroke-width', NumberText.format(this.strokeWidthValue)));
    }
    return views;
  }

  /** 序列化顺序与 views() 保持一致，保证 round-trip 后文件可 diff。 */
  serialized(): Array<readonly [string, string]> {
    return this.views().map((view) => [view.name, view.value] as const);
  }

  private static requirePaint(raw: string, name: string): string {
    const text = raw.trim();
    if (text === '') throw new CommandError(`${name} must not be empty`);
    return text;
  }
}
