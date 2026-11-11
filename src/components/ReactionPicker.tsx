import React, { useEffect, useRef } from 'react';
import { ReactionType, REACTION_EMOJIS } from '../types';

interface ReactionPickerProps {
  onSelectReaction: (type: ReactionType) => void;
  currentReaction?: ReactionType;
  onClose?: () => void;
}

const REACTION_KEYS: ReactionType[] = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onSelectReaction,
  currentReaction,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="glass-card px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xl border border-white/20 bg-slate-900/95 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-40"
      onClick={(e) => e.stopPropagation()}
    >
      {REACTION_KEYS.map((key) => {
        const item = REACTION_EMOJIS[key];
        const isSelected = currentReaction === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              onSelectReaction(key);
              onClose?.();
            }}
            className={`group relative p-1.5 rounded-full transition-all transform hover:scale-130 active:scale-95 cursor-pointer ${
              isSelected ? 'bg-white/25 scale-110 ring-2 ring-[var(--accent)]' : 'hover:bg-white/10'
            }`}
            title={item.label}
          >
            <span className="text-xl sm:text-2xl leading-none select-none drop-shadow-sm">
              {item.emoji}
            </span>

            {/* Hover tooltip label */}
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-[10px] text-white px-2 py-0.5 rounded-md whitespace-nowrap pointer-events-none font-medium z-50">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
