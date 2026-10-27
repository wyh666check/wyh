/**
 * 命令分类：决定 `help` 的分组，也决定"是否进入 undo 栈"的语义归属。
 *
 * - `document`：文档类（init / read / save / canvas），执行后 undo/redo 被禁止；
 * - `edit`：编辑类，可 undo/redo，一条命令一个 undo 单元；
 * - `query`：显示类，不改变状态、不进 undo 栈；
 * - `history`：undo / redo 自身。
 */
export type CommandCategory = 'document' | 'edit' | 'query' | 'history';
