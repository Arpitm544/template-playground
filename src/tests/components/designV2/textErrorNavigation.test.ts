import { describe, expect, it, vi } from 'vitest';
import type { editor } from 'monaco-editor';
import { textErrorRange, revealTextError } from '../../../components/designV2/textErrorNavigation';

describe('Text error navigation', () => {
  it('finds the exact variable in an expression when engine coordinates are -1', () => {
    const range = textErrorRange('owner in prose\n{{ownerName}}\n{{ owner }}', 'Unknown property: owner File text/grammar.tem.md line -1 column -1');
    expect(range).toEqual({ startLineNumber: 3, startColumn: 4, endLineNumber: 3, endColumn: 9 });
  });

  it('handles the unknown-variable format and formatted variables', () => {
    expect(textErrorRange('{{ amount as "USD" }}', 'Unknown variable {{amount}}')).toEqual({
      startLineNumber: 1, startColumn: 4, endLineNumber: 1, endColumn: 10,
    });
  });

  it('uses a reported line to distinguish repeated expressions', () => {
    expect(textErrorRange('{{owner}}\n{{owner}}', 'Unknown property: owner File text/grammar.tem.md line 2 column 3')?.startLineNumber).toBe(2);
  });

  it('uses real syntax-error coordinates when no variable is named', () => {
    expect(textErrorRange('hello\n{{bad', 'Parse error File text/grammar.tem.md line 2 column 3')).toEqual({
      startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 4,
    });
  });

  it.each([
    'Unknown property: missing File text/grammar.tem.md line -1 column -1',
    'Parse error line -1 column -1',
    'Parse error line 99 column 1',
    'Parse error line 1 column 99',
    'Rendering failed',
  ])('does not invent a highlight for an unlocatable error: %s', (error) => {
    expect(textErrorRange('{{owner}}', error)).toBeNull();
  });

  it('focuses, selects and scrolls to the offending variable without editing the document', () => {
    const instance = {
      getModel: () => ({ getValue: () => 'Heading\n{{owner}}' }),
      focus: vi.fn(), setSelection: vi.fn(), revealRangeInCenter: vi.fn(),
    };
    revealTextError(instance as unknown as editor.IStandaloneCodeEditor, 'Unknown property: owner');
    const expected = { startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 8 };
    expect(instance.focus).toHaveBeenCalledOnce();
    expect(instance.setSelection).toHaveBeenCalledWith(expected);
    expect(instance.revealRangeInCenter).toHaveBeenCalledWith(expected);
  });
});
