/**
 * 读入外部 SVG 时的 id 分配器。
 *
 * 规则（规范 2. 自动补 id）：缺 id 时按 `标签名 + 序号` 生成并告警；
 * 生成的名字必须避开文件中已出现的 id，因此这里同时维护"已占用集合"。
 */
export class IdAllocator {
  private readonly used = new Set<string>();
  private readonly counters = new Map<string, number>();

  /** 尝试占用给定 id；已被占用返回 false（调用方负责改分配并告警）。 */
  reserve(id: string): boolean {
    if (this.used.has(id)) return false;
    this.used.add(id);
    return true;
  }

  generate(tag: string): string {
    let counter = this.counters.get(tag) ?? 0;
    let candidate = '';
    do {
      counter += 1;
      candidate = `${tag}${counter}`;
    } while (this.used.has(candidate));
    this.counters.set(tag, counter);
    this.used.add(candidate);
    return candidate;
  }
}
