import { NumberText } from './NumberText';

/** 二维坐标值对象（不可变）：用于容器/叶子的定位点与回显。 */
export class Point {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  moved(dx: number, dy: number): Point {
    return new Point(this.x + dx, this.y + dy);
  }

  scaled(factor: number): Point {
    return new Point(this.x * factor, this.y * factor);
  }

  toString(): string {
    return `(${NumberText.format(this.x)},${NumberText.format(this.y)})`;
  }
}
