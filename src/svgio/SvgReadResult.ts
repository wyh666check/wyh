import type { Document } from '../domain/Document';

/** 读入结果：文档 + 读入过程中产生的告警（缺 id、重复 id、被跳过的元素等）。 */
export class SvgReadResult {
  constructor(
    readonly document: Document,
    readonly warnings: ReadonlyArray<string>,
  ) {}
}
