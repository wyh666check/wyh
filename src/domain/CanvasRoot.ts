import { Container } from './Container';

/**
 * 画布根容器：文档树的根，`id` 固定为 `svg`，在 `tree` 中显示为 `svg (w x h)`。
 *
 * 它是**不可寻址**的：`find` 不返回它，因此 `move svg …` / `delete svg` 之类的命令
 * 不会意外命中整份文档。它同时充当 `create` 省略 `in` 子句时的默认父容器。
 */
export class CanvasRoot extends Container {
  override readonly typeName = 'svg';

  constructor() {
    super('svg');
  }

  override get label(): string {
    return 'svg';
  }
}
