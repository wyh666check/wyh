import { NumberText } from '../shared/NumberText';

/**
 * 一个"几何属性"的声明：名字、取值器、写值器，以及树形显示时使用的短名。
 *
 * 有了它，具体图形只需要**声明一次**自己的几何字段（`x`/`y`/`width`/`height`…），
 * 基类就能统一实现 `attributes` / `readAttribute` / `writeAttribute` / `acceptsAttribute`，
 * 不必在每个子类里重复同样的分支逻辑。
 */
export class GeometryField {
  constructor(
    readonly name: string,
    private readonly getter: () => number,
    private readonly setter: (value: number) => void,
    readonly displayName: string = name,
  ) {}

  read(): number {
    return this.getter();
  }

  /** 解析并写入；非法数字抛 CommandError，因此校验天然发生在变更之前。 */
  write(raw: string): void {
    this.setter(NumberText.parse(raw));
  }

  format(): string {
    return NumberText.format(this.read());
  }

  /** 用于 undo 的原始值：保留完整精度，避免显示格式化带来的精度损失。 */
  raw(): string {
    return String(this.read());
  }
}
