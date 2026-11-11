import React from 'react';
import { LogIn, ArrowLeft } from 'lucide-react';
import { StudentUser, ActiveTab } from '../types';

interface HeaderProps {
  currentUser: StudentUser | null;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
  onGoBack: () => void;
  canGoBack: boolean;
  studentAvatars?: Record<string, string>;
  studentNames?: Record<string, string>;
  onOpenProfile?: (username: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onOpenAuth,
  onGoBack,
  canGoBack,
  studentAvatars,
  studentNames,
  onOpenProfile,
}) => {
  const currentDisplayName =
    (studentNames && currentUser && studentNames[currentUser.username.toLowerCase()]) ||
    currentUser?.displayName ||
    '';
  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full backdrop-blur-md bg-[var(--bg)]/90 border-b border-[var(--glass-border)] transition-colors h-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand wordmark & Back Button */}
        <div className="flex items-center gap-3">
          {canGoBack && (
            <button
              onClick={onGoBack}
              className="w-10 h-10 rounded-full inset-control flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text)] transition-colors cursor-pointer shrink-0"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft size={18} className="text-[var(--accent)]" />
            </button>
          )}

          <button
            onClick={() => onTabChange('playground')}
            className="flex items-center gap-2 hover:opacity-90 cursor-pointer shrink-0 max-h-10"
          >
            <img 
              src="/assets/aistudio/1000168760-removebg-preview_03adaab4.png" 
              alt="Gen-Z Portal" 
              style={{ height: '24px', maxHeight: '24px', width: 'auto', maxWidth: '120px' }}
              className="object-contain brightness-0 dark:invert"
            />
            <span className="text-[11px] font-normal text-[var(--text-secondary)] hidden sm:inline">
              · Study Playground
            </span>
          </button>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[var(--text-secondary)]">
          <button
            onClick={() => onTabChange('playground')}
            className={`whitespace-nowrap transition-colors hover:text-[var(--text)] cursor-pointer ${
              activeTab === 'playground' ? 'text-[var(--text)] font-semibold' : ''
            }`}
          >
            Study Playground
          </button>
          <button
            onClick={() => onTabChange('leaderboard')}
            className={`whitespace-nowrap transition-colors hover:text-[var(--text)] cursor-pointer ${
              activeTab === 'leaderboard' ? 'text-[var(--text)] font-semibold' : ''
            }`}
          >
            Top 10 Ranks
          </button>
          <button
            onClick={() => onTabChange('chat')}
            className={`whitespace-nowrap transition-colors hover:text-[var(--text)] cursor-pointer ${
              activeTab === 'chat' ? 'text-[var(--text)] font-semibold' : ''
            }`}
          >
            Live Student Chat
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <button
              onClick={() => onOpenProfile?.(currentUser.username)}
              className="flex items-center gap-2.5 p-1 pl-3 pr-2 rounded-full inset-control hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
            >
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-[var(--text)] leading-none group-hover:text-[var(--accent)] transition-colors">
                  {currentDisplayName}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                  @{currentUser.username}
                </div>
              </div>
              <img
                src={(studentAvatars && currentUser && studentAvatars[currentUser.username.toLowerCase()]) || currentUser.avatarUrl}
                alt={currentDisplayName}
                className="w-7 h-7 rounded-full object-cover aspect-square border border-[var(--glass-border)] bg-black/20 group-hover:scale-105 transition-transform"
              />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn-primary py-2 px-4 text-xs font-semibold whitespace-nowrap"
            >
              <LogIn size={14} />
              <span>Sign In / Join</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
