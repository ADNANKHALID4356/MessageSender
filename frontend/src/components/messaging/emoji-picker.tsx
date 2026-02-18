'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'],
  'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Objects': ['⭐', '🌟', '✨', '💫', '🔥', '💥', '💯', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '📱', '💻', '📧', '📩', '📝', '📋', '📌', '📎', '🔗', '🔑', '🔒', '⏰', '📅', '✅', '❌', '⚠️', '💡', '🔔', '📢'],
  'Nature': ['🌸', '🌺', '🌹', '🌷', '🌻', '🌼', '🍀', '🌳', '🌲', '🏔️', '🌊', '☀️', '🌙', '⭐', '🌈', '🦋', '🐝', '🐶', '🐱', '🐰'],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Smileys');
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const displayEmojis = search
    ? allEmojis
    : EMOJI_CATEGORIES[activeCategory] || [];

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-lg px-2"
        title="Insert emoji"
      >
        😊
      </Button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-80 bg-popover border rounded-lg shadow-lg z-50 p-2">
          <input
            type="text"
            placeholder="Search emoji..."
            className="w-full px-2 py-1 text-sm border rounded mb-2 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          {!search && (
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
            {displayEmojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                className="text-xl hover:bg-muted rounded p-1 transition-colors"
                onClick={() => {
                  onSelect(emoji);
                  setIsOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
