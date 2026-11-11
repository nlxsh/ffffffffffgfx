import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { PlaygroundView } from './components/PlaygroundView';
import { LeaderboardView } from './components/LeaderboardView';
import { GlobalChatView } from './components/GlobalChatView';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { NoteDetailView } from './components/NoteDetailView';
import { AuthModal } from './components/AuthModal';
import { StudentProfileView } from './components/StudentProfileView';
import { StudentUser, StudyNote, ActiveTab, NotificationItem } from './types';
import {
  getCurrentUser,
  logoutStudent,
  subscribeToNotes,
  subscribeToStudentAvatars,
  subscribeToNotifications,
} from './services/firebase';

export default function App() {
  const [currentUser, setCurrentUser] = useState<StudentUser | null>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState<ActiveTab>('playground');
  const [tabHistory, setTabHistory] = useState<ActiveTab[]>(['playground']);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [inspectedUsername, setInspectedUsername] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [studentAvatars, setStudentAvatars] = useState<Record<string, string>>({});
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // If user is not authenticated on first launch, prompt them to create an account
  useEffect(() => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
    }
  }, []);

  // Theme application to root HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.setAttribute('data-theme', 'dark');
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleTabChange = (nextTab: ActiveTab) => {
    if (selectedNoteId) {
      setSelectedNoteId(null);
    }
    if (nextTab !== activeTab) {
      setTabHistory((prev) => [...prev, activeTab]);
      setActiveTab(nextTab);
    }
  };

  const handleGoBack = () => {
    if (inspectedUsername) {
      setInspectedUsername(null);
      return;
    }
    if (selectedNoteId) {
      setSelectedNoteId(null);
      return;
    }
    if (tabHistory.length > 0) {
      const prev = tabHistory[tabHistory.length - 1];
      setTabHistory((current) => current.slice(0, current.length - 1));
      setActiveTab(prev);
    } else {
      setActiveTab('playground');
    }
  };

  // Subscribe to real-time Firestore notes
  useEffect(() => {
    const unsubscribe = subscribeToNotes((updatedNotes) => {
      setNotes(updatedNotes);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time notifications for current user
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const unsubscribe = subscribeToNotifications(currentUser.username, (items) => {
      setNotifications(items);
    });
    return () => unsubscribe();
  }, [currentUser?.username]);

  // Subscribe to real-time student avatars & display names map
  useEffect(() => {
    const unsubscribe = subscribeToStudentAvatars((avatarMap, nameMap) => {
      setStudentAvatars(avatarMap || {});
      if (nameMap) setStudentNames(nameMap);

      const current = getCurrentUser();
      if (current) {
        const lower = current.username.toLowerCase();
        let isChanged = false;
        const next = { ...current };

        if (avatarMap && avatarMap[lower] && current.avatarUrl !== avatarMap[lower]) {
          next.avatarUrl = avatarMap[lower];
          isChanged = true;
        }
        if (nameMap && nameMap[lower] && current.displayName !== nameMap[lower]) {
          next.displayName = nameMap[lower];
          isChanged = true;
        }
        if (isChanged) {
          setCurrentUser(next);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (user: StudentUser) => {
    setCurrentUser(user);
    if (user.avatarUrl) {
      setStudentAvatars((prev) => ({
        ...prev,
        [user.username.toLowerCase()]: user.avatarUrl,
      }));
    }
    setIsAuthModalOpen(false);
  };

  const handleUserUpdated = (updatedUser: StudentUser) => {
    setCurrentUser(updatedUser);
    if (updatedUser.avatarUrl) {
      setStudentAvatars((prev) => ({
        ...prev,
        [updatedUser.username.toLowerCase()]: updatedUser.avatarUrl,
      }));
    }
  };

  const handleLogout = () => {
    logoutStudent();
    setCurrentUser(null);
    setSelectedNoteId(null);
    setActiveTab('playground');
    setTabHistory(['playground']);
    setIsAuthModalOpen(true);
  };

  const userNotes = currentUser
    ? notes.filter((n) => n.authorUsername === currentUser.username)
    : [];

  const selectedNote = notes.find((n) => n.id === selectedNoteId);
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col selection:bg-[var(--accent)] selection:text-[var(--accent-dark)]">
      {/* Top Header with Back Navigation */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onGoBack={handleGoBack}
        canGoBack={inspectedUsername !== null || selectedNoteId !== null}
        studentAvatars={studentAvatars}
        studentNames={studentNames}
        onOpenProfile={(u) => setInspectedUsername(u)}
      />

      {/* Main Content Area: Smoothly scrolls between fixed header and fixed bottom navbar */}
      <main className="flex-1 w-full mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-32">
        {selectedNoteId && selectedNote ? (
          <NoteDetailView
            note={selectedNote}
            currentUser={currentUser}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            onGoBack={() => setSelectedNoteId(null)}
            studentAvatars={studentAvatars}
            studentNames={studentNames}
            onOpenProfile={(u) => setInspectedUsername(u)}
          />
        ) : (
          <>
            {activeTab === 'playground' && (
              <PlaygroundView
                notes={notes}
                currentUser={currentUser}
                onRequireAuth={() => setIsAuthModalOpen(true)}
                studentAvatars={studentAvatars}
                studentNames={studentNames}
                onOpenProfile={(u) => setInspectedUsername(u)}
                onSelectNote={(noteId) => setSelectedNoteId(noteId)}
              />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardView
                notes={notes}
                currentUser={currentUser}
                onRequireAuth={() => setIsAuthModalOpen(true)}
                onNavigateToPlayground={() => handleTabChange('playground')}
                studentAvatars={studentAvatars}
                studentNames={studentNames}
                onOpenProfile={(u) => setInspectedUsername(u)}
              />
            )}

            {activeTab === 'chat' && (
              <GlobalChatView
                currentUser={currentUser}
                onRequireAuth={() => setIsAuthModalOpen(true)}
                studentAvatars={studentAvatars}
                studentNames={studentNames}
                onOpenProfile={(u) => setInspectedUsername(u)}
                onGoBack={handleGoBack}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsView
                currentUser={currentUser}
                notifications={notifications}
                onRequireAuth={() => setIsAuthModalOpen(true)}
                onSelectNote={(noteId) => setSelectedNoteId(noteId)}
                studentAvatars={studentAvatars}
                onOpenProfile={(u) => setInspectedUsername(u)}
              />
            )}

            {activeTab === 'profile' && currentUser && (
              <ProfileView
                currentUser={currentUser}
                notes={notes}
                userNotes={userNotes}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
                studentAvatars={studentAvatars}
                studentNames={studentNames}
                onUserUpdated={handleUserUpdated}
                onOpenProfile={(u) => setInspectedUsername(u)}
                onRequireAuth={() => setIsAuthModalOpen(true)}
                onSelectNote={(noteId) => setSelectedNoteId(noteId)}
              />
            )}

            {activeTab === 'profile' && !currentUser && (
              <div className="glass-card max-w-md mx-auto p-8 rounded-3xl text-center space-y-4">
                <h3 className="text-base font-bold text-[var(--text)]">Sign In Required</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Create your unique account or sign in to view your profile, rank, and posts.
                </p>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="btn-primary py-2.5 px-6 text-xs font-semibold"
                >
                  Sign In / Join Gen-Z Portal
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Floating Liquid Glass Switcher Navigation - Hidden on full-screen profile, note detail, & chat */}
      {!inspectedUsername && !selectedNoteId && activeTab !== 'chat' && (
        <Navigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadNotifsCount={unreadNotifsCount}
        />
      )}

      {/* Auth Modal for unique username registration and login */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onSuccess={handleAuthSuccess}
        onClose={() => setIsAuthModalOpen(false)}
        canClose={currentUser !== null}
      />

      {/* Full-Screen Facebook-Style Student Profile View */}
      {inspectedUsername && (
        <StudentProfileView
          username={inspectedUsername}
          currentUser={currentUser}
          allNotes={notes}
          studentAvatars={studentAvatars}
          studentNames={studentNames}
          onGoBack={() => setInspectedUsername(null)}
          onRequireAuth={() => setIsAuthModalOpen(true)}
          onSelectNote={(noteId) => {
            setInspectedUsername(null);
            setSelectedNoteId(noteId);
          }}
          onOpenProfile={(u) => setInspectedUsername(u)}
        />
      )}
    </div>
  );
}
