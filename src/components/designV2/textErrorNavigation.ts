import type { editor, IRange } from "monaco-editor";

/** Locate the named variable when the engine reports unusable line -1/column -1. */
export const textErrorRange = (text: string, error: string): IRange | null => {
  const location = /\bline\s+(-?\d+)(?:\s+column\s+(-?\d+))?/i.exec(error);
  const line = Number(location?.[1]);
  const column = Number(location?.[2] ?? 1);
  const name = /\bUnknown (?:property|variable):?\s*(?:\{\{\s*)?["'`]?([\w$.]+)/i.exec(error)?.[1];
  if (name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const token = new RegExp(`(^|[^\\w$])(${escaped})(?![\\w$])`);
    const matches: IRange[] = [];
    // Only search TemplateMark expressions, never matching the same word in prose.
    for (const expression of text.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
      const match = token.exec(expression[1]);
      if (!match) continue;
      const offset = expression.index + 2 + match.index + match[1].length;
      const before = text.slice(0, offset);
      const lineNumber = before.split("\n").length;
      const startColumn = offset - before.lastIndexOf("\n");
      matches.push({ startLineNumber: lineNumber, startColumn, endLineNumber: lineNumber, endColumn: startColumn + name.length });
    }
    return matches.find((range) => range.startLineNumber === line) ?? matches[0] ?? null;
  }

  const lines = text.split("\n");
  if (line < 1 || line > lines.length || !Number.isInteger(line) || column < 1 || column > lines[line - 1].length + 1) return null;
  return { startLineNumber: line, startColumn: column, endLineNumber: line, endColumn: Math.min(column + 1, lines[line - 1].length + 1) };
};

export const revealTextError = (instance: editor.IStandaloneCodeEditor, error: string) => {
  const model = instance.getModel();
  if (!model) return;
  const range = textErrorRange(model.getValue(), error);
  instance.focus();
  if (!range) return;
  instance.setSelection(range);
  instance.revealRangeInCenter(range);
};
