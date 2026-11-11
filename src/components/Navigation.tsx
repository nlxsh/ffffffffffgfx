import React, { useEffect, useRef } from 'react';
import { Home, Trophy, MessageSquare, Bell, User } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  unreadChatCount?: number;
  unreadNotifsCount?: number;
}

interface TabItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }>;
}

const TABS: TabItem[] = [
  { id: 'playground', label: 'Study Playground', icon: Home },
  { id: 'chat', label: 'Live Global Chat', icon: MessageSquare },
  { id: 'leaderboard', label: 'Top 10 Leaderboard', icon: Trophy },
  { id: 'notifications', label: 'Activity & Notifications', icon: Bell },
  { id: 'profile', label: 'Student Profile', icon: User },
];

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  unreadChatCount = 0,
  unreadNotifsCount = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<ActiveTab, HTMLButtonElement>>(new Map());

  // Dynamically compute the liquid pill position from offsetLeft
  const updateIndicatorPosition = () => {
    const container = containerRef.current;
    if (!container) return;

    const activeButton = buttonRefs.current.get(activeTab);
    if (!activeButton) return;

    const moveOffset = activeButton.offsetLeft - 6; // 0.375rem = 6px
    container.style.setProperty('--move', `${moveOffset}px`);
  };

  useEffect(() => {
    updateIndicatorPosition();

    const handleResize = () => {
      updateIndicatorPosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    if (e.key === 'ArrowRight') {
      const nextIndex = (currentIndex + 1) % TABS.length;
      onTabChange(TABS[nextIndex].id);
      buttonRefs.current.get(TABS[nextIndex].id)?.focus();
    } else if (e.key === 'ArrowLeft') {
      const prevIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      onTabChange(TABS[prevIndex].id);
      buttonRefs.current.get(TABS[prevIndex].id)?.focus();
    }
  };

  return (
    <nav
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
      aria-label="App Navigation"
    >
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Main tabs"
        onKeyDown={handleKeyDown}
        className="switcher shadow-2xl"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) buttonRefs.current.set(tab.id, el);
                else buttonRefs.current.delete(tab.id);
              }}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              title={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={`switcher-btn relative ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} strokeWidth={2} />

              {tab.id === 'notifications' && unreadNotifsCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center leading-none border border-slate-900 shadow-sm"
                  aria-label={`${unreadNotifsCount} unread notifications`}
                >
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}

              {tab.id === 'chat' && unreadChatCount > 0 && !isActive && (
                <span
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-200"
                  aria-label={`${unreadChatCount} unread messages`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
