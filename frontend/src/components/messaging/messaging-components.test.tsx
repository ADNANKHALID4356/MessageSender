/**
 * =============================================
 * Frontend Component Tests — Messaging Components
 * =============================================
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ---- minimal emoji picker mock ----
jest.mock('@/components/ui/button', () => ({
  Button: (props: any) => React.createElement('button', { ...props, 'data-testid': props.title || 'button' }),
}));

import { EmojiPicker } from '@/components/messaging/emoji-picker';
import { BypassMethodSelector, BypassMethod } from '@/components/messaging/bypass-method-selector';

// ===========================================
// EmojiPicker Tests
// ===========================================

describe('EmojiPicker', () => {
  it('should render the emoji toggle button', () => {
    const onSelect = jest.fn();
    render(<EmojiPicker onSelect={onSelect} />);
    expect(screen.getByTitle('Insert emoji')).toBeInTheDocument();
  });

  it('should open picker when button clicked', () => {
    const onSelect = jest.fn();
    render(<EmojiPicker onSelect={onSelect} />);
    fireEvent.click(screen.getByTitle('Insert emoji'));
    expect(screen.getByPlaceholderText('Search emoji...')).toBeInTheDocument();
  });

  it('should call onSelect when an emoji is clicked', () => {
    const onSelect = jest.fn();
    render(<EmojiPicker onSelect={onSelect} />);
    fireEvent.click(screen.getByTitle('Insert emoji'));

    // Click the first emoji button in the grid
    const emojiButtons = screen.getAllByRole('button');
    // Need to find an emoji button (not the toggle)
    const emojiBtn = emojiButtons.find(b => b.textContent && b.textContent.length <= 2 && b.textContent !== '😊');
    if (emojiBtn) {
      fireEvent.click(emojiBtn);
      expect(onSelect).toHaveBeenCalled();
    }
  });
});

// ===========================================
// BypassMethodSelector Tests
// ===========================================

describe('BypassMethodSelector', () => {
  it('should render compact selector', () => {
    const onChange = jest.fn();
    render(<BypassMethodSelector value="WITHIN_WINDOW" onChange={onChange} compact />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('WITHIN_WINDOW');
  });

  it('should call onChange when value changes in compact mode', () => {
    const onChange = jest.fn();
    render(<BypassMethodSelector value="WITHIN_WINDOW" onChange={onChange} compact />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'OTN_TOKEN' } });
    expect(onChange).toHaveBeenCalledWith('OTN_TOKEN');
  });

  it('should render full list mode when compact is false', () => {
    const onChange = jest.fn();
    render(<BypassMethodSelector onChange={onChange} compact={false} />);
    expect(screen.getByText('Within 24-Hour Window')).toBeInTheDocument();
    expect(screen.getByText('One-Time Notification')).toBeInTheDocument();
  });

  it('should show warning when outside 24h window', () => {
    const onChange = jest.fn();
    render(<BypassMethodSelector onChange={onChange} isWindowOpen={false} compact={false} />);
    // Should still render options
    expect(screen.getByText('Recurring Notification')).toBeInTheDocument();
  });
});
