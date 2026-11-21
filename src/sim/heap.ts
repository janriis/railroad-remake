/** Binary min-heap. Ties pop in insertion order, which keeps pathfinding deterministic. */
export class MinHeap<T> {
  private readonly items: { key: number; seq: number; value: T }[] = [];
  private seq = 0;

  get size(): number {
    return this.items.length;
  }

  push(key: number, value: T): void {
    this.items.push({ key, seq: this.seq++, value });
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }

  pop(): { key: number; value: T } | undefined {
    const top = this.items[0];
    if (!top) return undefined;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.less(l, m)) m = l;
        if (r < this.items.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return { key: top.key, value: top.value };
  }

  private less(a: number, b: number): boolean {
    const [x, y] = [this.items[a]!, this.items[b]!];
    return x.key < y.key || (x.key === y.key && x.seq < y.seq);
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b]!, this.items[a]!];
  }
}
