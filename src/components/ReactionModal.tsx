import React, { useState } from 'react';
import { X, Heart } from 'lucide-react';
import { ReactionType, REACTION_EMOJIS } from '../types';

interface ReactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactions?: Record<string, ReactionType>;
  likedBy?: string[];
  studentAvatars?: Record<string, string>;
  studentNames?: Record<string, string>;
  onOpenProfile?: (username: string) => void;
  noteTitle?: string;
}

export const ReactionModal: React.FC<ReactionModalProps> = ({
  isOpen,
  onClose,
  reactions = {},
  likedBy = [],
  studentAvatars,
  studentNames,
  onOpenProfile,
  noteTitle,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'all' | ReactionType>('all');

  // Build unified user list from reactions map or fallback likedBy array
  const userReactionEntries: { username: string; reactionType: ReactionType }[] = [];

  const processedUsernames = new Set<string>();

  // Extract from reactions map
  for (const [username, rType] of Object.entries(reactions)) {
    if (rType) {
      userReactionEntries.push({ username, reactionType: rType });
      processedUsernames.add(username.toLowerCase());
    }
  }

  // Fallback for older likes
  for (const username of likedBy) {
    if (!processedUsernames.has(username.toLowerCase())) {
      userReactionEntries.push({ username, reactionType: 'like' });
    }
  }

  // Count per reaction type
  const counts: Record<string, number> = { all: userReactionEntries.length };
  const keys: ReactionType[] = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];

  for (const k of keys) {
    counts[k] = userReactionEntries.filter((e) => e.reactionType === k).length;
  }

  // Filter list by active tab
  const filteredList =
    activeTab === 'all'
      ? userReactionEntries
      : userReactionEntries.filter((e) => e.reactionType === activeTab);

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="glass-card max-w-md w-full rounded-3xl overflow-hidden border border-white/20 bg-slate-900/95 text-[var(--text)] shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--glass-border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-rose-400 fill-rose-400" />
            <h3 className="text-base font-bold text-[var(--text)]">Reactions</h3>
            <span className="text-xs text-[var(--text-secondary)] font-mono">
              ({userReactionEntries.length})
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full inset-control flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto border-b border-[var(--glass-border)] scrollbar-none shrink-0 bg-white/5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'bg-[var(--accent)] text-[var(--accent-dark)] font-bold'
                : 'inset-control text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            All {counts.all}
          </button>

          {keys.map((k) => {
            const item = REACTION_EMOJIS[k];
            const c = counts[k] || 0;
            if (c === 0 && activeTab !== k) return null;

            return (
              <button
                key={k}
                onClick={() => setActiveTab(k)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                  activeTab === k
                    ? 'bg-[var(--accent)] text-[var(--accent-dark)] font-bold'
                    : 'inset-control text-[var(--text-secondary)] hover:text-[var(--text)]'
                }`}
              >
                <span>{item.emoji}</span>
                <span>{c}</span>
              </button>
            );
          })}
        </div>

        {/* Student List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-[var(--glass-border)] space-y-1">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
              No reactions in this category yet.
            </div>
          ) : (
            filteredList.map((entry) => {
              const avatar =
                (studentAvatars && studentAvatars[entry.username.toLowerCase()]) ||
                'https://api.dicebear.com/7.x/bottts/svg?seed=' + entry.username;
              const rMeta = REACTION_EMOJIS[entry.reactionType] || REACTION_EMOJIS.like;

              return (
                <div
                  key={entry.username}
                  onClick={() => {
                    onClose();
                    onOpenProfile?.(entry.username);
                  }}
                  className="py-2.5 px-2 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={avatar}
                        alt={entry.username}
                        className="w-10 h-10 rounded-full object-cover aspect-square border border-white/20 bg-black/40"
                      />
                      <span className="absolute -bottom-1 -right-1 text-sm drop-shadow-md leading-none">
                        {rMeta.emoji}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text)] group-hover:underline truncate">
                        {(studentNames && studentNames[entry.username.toLowerCase()]) || `@${entry.username}`}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] truncate">
                        @{entry.username} · Reacted {rMeta.label}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs text-[var(--accent)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View Profile
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
