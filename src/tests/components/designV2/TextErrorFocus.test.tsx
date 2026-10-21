import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TextView } from '../../../components/designV2/TextView';
import useAppStore from '../../../store/store';
import useDesignV2Store from '../../../store/designV2Store';

const instance = vi.hoisted(() => ({
  getModel: () => ({ getValue: () => '# Contract\n{{missingTestVariable}}' }),
  focus: vi.fn(), setSelection: vi.fn(), revealRangeInCenter: vi.fn(),
}));

// Make the editor ready explicitly to exercise Monaco's delayed mount.
vi.mock('../../../editors/editorsContainer/TemplateMarkdown', () => ({
  default: ({ onEditorReady }: { onEditorReady: (editor: typeof instance) => void }) => (
    <button onClick={() => onEditorReady(instance)}>Editor ready</button>
  ),
}));

const error = 'Unknown property: missingTestVariable File text/grammar.tem.md line -1 column -1';

describe('Open Text error focus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDesignV2Store.setState({ textErrorToReveal: null, helpRailOpen: true });
    useAppStore.setState({ error, editorValue: '# Contract\n{{missingTestVariable}}' });
  });

  it('waits for the editor, highlights the variable, and consumes the request once', () => {
    useDesignV2Store.getState().openTextError(error);
    render(<TextView />);
    expect(instance.focus).not.toHaveBeenCalled();
    expect(useDesignV2Store.getState().textErrorToReveal).toBe(error);

    fireEvent.click(screen.getByRole('button', { name: 'Editor ready' }));
    expect(instance.focus).toHaveBeenCalledOnce();
    expect(instance.setSelection).toHaveBeenCalledWith({
      startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 22,
    });
    expect(instance.revealRangeInCenter).toHaveBeenCalledOnce();
    expect(useDesignV2Store.getState().textErrorToReveal).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Editor ready' }));
    expect(instance.focus).toHaveBeenCalledOnce();
  });

  it('does not move the cursor on a normal visit to Text', () => {
    render(<TextView />);
    fireEvent.click(screen.getByRole('button', { name: 'Editor ready' }));
    expect(instance.focus).not.toHaveBeenCalled();
  });

  it('cancels the pending highlight when the user goes Back before Monaco mounts', () => {
    useDesignV2Store.getState().openTextError(error);
    useDesignV2Store.getState().goBack();
    expect(useDesignV2Store.getState().textErrorToReveal).toBeNull();
  });

  it('does not highlight an error that was cleared before the editor mounted', () => {
    useDesignV2Store.getState().openTextError(error);
    useAppStore.setState({ error: undefined });
    render(<TextView />);
    fireEvent.click(screen.getByRole('button', { name: 'Editor ready' }));
    expect(instance.setSelection).not.toHaveBeenCalled();
    expect(useDesignV2Store.getState().textErrorToReveal).toBeNull();
  });
});
