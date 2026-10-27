/** 词法单元：`quoted` 记录它是否来自双引号，供解析 `in` 子句等歧义场景区分。 */
export class Token {
  constructor(
    readonly value: string,
    readonly quoted: boolean,
  ) {}
}
