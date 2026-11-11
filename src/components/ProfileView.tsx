import React, { useState, useRef, useEffect } from 'react';
import { Heart, Upload, LogOut, Sun, Moon, Trash2, Eye, X, Camera, User } from 'lucide-react';
import { StudentUser, StudyNote, ProfileViewRecord } from '../types';
import { NoteCard } from './NoteCard';
import { compressImage } from '../utils/imageCompressor';
import { formatCompactNumber } from '../utils/numberFormatter';
import {
  setCurrentUser,
  computeLeaderboardFromNotes,
  updateStudentAvatar,
  updateStudentCoverPhoto,
  deleteStudyNote,
  subscribeToProfileViews,
  updateStudentProfile,
} from '../services/firebase';
import { Edit2, Check } from 'lucide-react';

interface ProfileViewProps {
  currentUser: StudentUser;
  notes: StudyNote[];
  userNotes: StudyNote[];
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  studentAvatars?: Record<string, string>;
  studentNames?: Record<string, string>;
  onUserUpdated?: (user: StudentUser) => void;
  onOpenProfile?: (username: string) => void;
  onRequireAuth?: () => void;
  onSelectNote?: (noteId: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  notes,
  userNotes,
  onLogout,
  theme,
  onToggleTheme,
  studentAvatars,
  studentNames,
  onUserUpdated,
  onOpenProfile,
  onRequireAuth,
  onSelectNote,
}) => {
  const currentLiveAvatar =
    (studentAvatars && studentAvatars[currentUser.username.toLowerCase()]) ||
    currentUser.avatarUrl;
  const [avatar, setAvatar] = useState(currentLiveAvatar);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [cover, setCover] = useState(currentUser.coverUrl || '');
  const [isUpdatingCover, setIsUpdatingCover] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // TikTok-style Profile Views state
  const [profileViews, setProfileViews] = useState<ProfileViewRecord[]>([]);
  const [isViewsModalOpen, setIsViewsModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(currentUser.displayName);
  const [editBio, setEditBio] = useState(currentUser.bio || '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setIsUpdatingProfile(true);

    try {
      const updatedUser = await updateStudentProfile(currentUser.username, {
        displayName: editDisplayName,
        bio: editBio,
      });
      onUserUpdated?.(updatedUser);
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Sync with live avatar & cover updates
  useEffect(() => {
    if (studentAvatars && studentAvatars[currentUser.username.toLowerCase()]) {
      setAvatar(studentAvatars[currentUser.username.toLowerCase()]);
    } else {
      setAvatar(currentUser.avatarUrl);
    }
    if (currentUser.coverUrl) {
      setCover(currentUser.coverUrl);
    }
  }, [currentUser.avatarUrl, currentUser.coverUrl, currentUser.username, studentAvatars]);

  // Subscribe to real-time profile views
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToProfileViews(currentUser.username, (views) => {
      setProfileViews(views);
    });
    return () => unsubscribe();
  }, [currentUser.username]);

  const top10 = computeLeaderboardFromNotes(notes, studentAvatars, studentNames);
  const myLeaderboardRank = top10.find(
    (item) => item.username.toLowerCase() === currentUser.username.toLowerCase()
  );

  // Calculate real total likes received from user's active notes
  const realLikesReceived = userNotes.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdatingAvatar(true);

    try {
      const res = await compressImage(file, {
        maxDimension: 320,
        quality: 0.75,
        maxSizeBytes: 40_000,
        mimeType: 'image/webp',
      });

      setAvatar(res.dataUrl);

      const updatedUser = {
        ...currentUser,
        avatarUrl: res.dataUrl,
      };
      setCurrentUser(updatedUser);
      onUserUpdated?.(updatedUser);

      try {
        await updateStudentAvatar(currentUser.username, res.dataUrl);
      } catch (err) {
        console.warn('Avatar sync notice:', err);
      }
    } catch (err) {
      console.error('Failed to update avatar:', err);
    } finally {
      setIsUpdatingAvatar(false);
    }
  };


  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdatingCover(true);

    try {
      const res = await compressImage(file, {
        maxDimension: 960,
        quality: 0.72,
        maxSizeBytes: 75_000,
        mimeType: 'image/webp',
      });

      setCover(res.dataUrl);

      const updatedUser = {
        ...currentUser,
        coverUrl: res.dataUrl,
        coverPositionY: 50,
      };
      setCurrentUser(updatedUser);
      onUserUpdated?.(updatedUser);

      try {
        await updateStudentCoverPhoto(currentUser.username, res.dataUrl, 50);
      } catch (err) {
        console.warn('Cover sync notice:', err);
      }
    } catch (err) {
      console.error('Failed to update cover photo:', err);
    } finally {
      setIsUpdatingCover(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = '';
      }
    }
  };


  const handleDeleteUserNote = async (noteId: string) => {
    try {
      await deleteStudyNote(noteId, currentUser.username);
      setDeletingNoteId(null);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pt-2 sm:pt-4">
      {/* Profile Card with Cover Photo Banner */}
      <div className="glass-card rounded-3xl overflow-hidden border border-[var(--glass-border)] shadow-xl">
        {/* Cover Photo Area */}
        <div className="h-28 sm:h-36 w-full bg-gradient-to-r from-blue-900/40 via-purple-900/35 to-slate-900/50 relative overflow-hidden group">
          {cover ? (
            <img
              src={cover}
              alt="Cover"
              style={{ objectPosition: `center ${currentUser.coverPositionY ?? 50}%` }}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.01]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/70 via-purple-950/60 to-slate-900/80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

          {/* Action buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={() => coverFileInputRef.current?.click()}
              disabled={isUpdatingCover}
              className="px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/25 transition-all cursor-pointer shadow-xl active:scale-95"
              title="Upload or change cover photo"
            >
              <Camera size={14} className="text-[var(--accent)]" />
              <span>{isUpdatingCover ? 'Processing...' : cover ? 'Change' : 'Add Cover'}</span>
            </button>
          </div>
          <input
            ref={coverFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
          />
        </div>

        <div className="p-6 sm:p-8 pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 -mt-12 sm:-mt-14 mb-4">
            {/* Avatar with Silent Upload */}
            <div className="relative group shrink-0 mt-2 sm:mt-0 w-24 h-24 shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-[var(--bg)] bg-black/40 shadow-xl relative">
                <img
                  src={avatar}
                  alt={currentUser.displayName}
                  className="w-full h-full object-cover aspect-square"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdatingAvatar}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] cursor-pointer"
                  title="Change Avatar from Gallery"
                >
                  <Upload size={16} className="mb-0.5" />
                  <span>{isUpdatingAvatar ? 'Uploading...' : 'Change'}</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* User Details */}
            <div className="flex-1 text-center sm:text-left min-w-0 pt-2 sm:pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text)]">
                    {currentUser.displayName}
                  </h2>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    @{currentUser.username}
                  </div>
                </div>

              {/* TikTok Views Tracker, Theme Toggle, & View Profile Buttons */}
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <button
                  onClick={() => onOpenProfile?.(currentUser.username)}
                  className="inset-control px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:bg-[var(--accent)] hover:text-[var(--accent-dark)] text-[var(--accent)] transition-all cursor-pointer shadow-sm border border-[var(--accent)]/20"
                >
                  <User size={14} />
                  <span>View Public Profile</span>
                </button>

                <button
                  onClick={() => setIsViewsModalOpen(true)}
                  className="inset-control px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white/10 text-[var(--text-secondary)] cursor-pointer"
                  title="See who viewed your profile"
                >
                  <Eye size={14} />
                  <span>{profileViews.length} Views</span>
                </button>

                <button
                  onClick={onToggleTheme}
                  className="inset-control px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white/10 cursor-pointer"
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>

                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="inset-control px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:bg-[var(--accent)] hover:text-[var(--accent-dark)] text-[var(--accent)] transition-all cursor-pointer shadow-sm border border-[var(--accent)]/20"
                >
                  <Edit2 size={14} />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-[var(--text)] mt-3 leading-relaxed">
              {currentUser.bio}
            </p>

            {/* Compact 3-Column Metrics: '#--' fits perfectly on mobile */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-[var(--glass-border)]">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--inset-bg)] border border-[var(--glass-border)] text-center min-w-0">
                <div className="text-base sm:text-lg font-bold font-mono text-[var(--accent)] tracking-tight">
                  {myLeaderboardRank ? `#0${myLeaderboardRank.rank}` : '#--'}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mt-0.5 truncate">
                  Rank
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--inset-bg)] border border-[var(--glass-border)] text-center min-w-0 overflow-hidden">
                <div 
                  className="text-base sm:text-lg font-bold font-mono text-rose-400 truncate"
                  title={realLikesReceived.toLocaleString()}
                >
                  {formatCompactNumber(realLikesReceived)}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mt-0.5 truncate">
                  Upvotes
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--inset-bg)] border border-[var(--glass-border)] text-center min-w-0 overflow-hidden">
                <div 
                  className="text-base sm:text-lg font-bold font-mono text-[var(--text)] truncate"
                  title={userNotes.length.toLocaleString()}
                >
                  {formatCompactNumber(userNotes.length)}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mt-0.5 truncate">
                  Posts
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logout strip */}
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-secondary)]">
            Member since {new Date(currentUser.createdAt).toLocaleDateString()}
          </span>

          <button
            onClick={onLogout}
            className="inset-control px-4 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>

      {/* User's Published Posts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider">
            Your Posts ({userNotes.length})
          </h3>
          <span className="text-[11px] text-[var(--text-secondary)]">
            Manage posts
          </span>
        </div>

        {userNotes.length === 0 ? (
          <div className="glass-container p-8 rounded-3xl text-center text-xs text-[var(--text-secondary)]">
            You haven't shared any posts yet. Create a post to earn upvotes!
          </div>
        ) : (
          <div className="space-y-4">
            {userNotes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                currentUser={currentUser}
                onRequireAuth={onRequireAuth || (() => {})}
                studentAvatars={studentAvatars}
                studentNames={studentNames}
                onOpenProfile={onOpenProfile}
                onSelectNote={onSelectNote}
              />
            ))}
          </div>
        )}
      </div>

      {/* TikTok-Style Profile Views Modal */}
      {isViewsModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-md p-5 rounded-3xl space-y-4 max-h-[80vh] flex flex-col border border-white/20">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text)]">Profile Views Tracker</h3>
              </div>
              <button
                onClick={() => setIsViewsModalOpen(false)}
                className="w-8 h-8 rounded-full inset-control flex items-center justify-center hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Only you can see students who viewed your profile.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {profileViews.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                  No profile views recorded yet. Share posts to get discovered by peers!
                </div>
              ) : (
                profileViews.map((v) => {
                  const viewAvatar =
                    (studentAvatars && studentAvatars[v.viewerUsername.toLowerCase()]) ||
                    v.viewerAvatar;

                  return (
                    <div
                      key={v.viewerUsername}
                      onClick={() => {
                        setIsViewsModalOpen(false);
                        onOpenProfile?.(v.viewerUsername);
                      }}
                      className="p-3 rounded-2xl bg-[var(--inset-bg)] border border-[var(--glass-border)] flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={viewAvatar}
                          alt={v.viewerDisplayName}
                          className="w-8 h-8 rounded-full object-cover aspect-square border border-white/15"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text)] truncate">
                            {v.viewerDisplayName}
                          </div>
                           <div className="text-[10px] text-[var(--text-secondary)] truncate">
                            @{v.viewerUsername}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] text-[var(--accent)] shrink-0 font-mono">
                        {new Date(v.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="glass-card w-full max-w-md p-6 rounded-[2.5rem] space-y-6 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text)]">Edit Profile</h3>
              <button
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileError(null);
                  setEditDisplayName(currentUser.displayName);
                  setEditBio(currentUser.bio || '');
                }}
                className="w-9 h-9 rounded-full inset-control flex items-center justify-center hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">
                  Display Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full bg-[var(--inset-bg)] border border-[var(--glass-border)] rounded-2xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-all"
                    maxLength={30}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-secondary)] font-mono">
                    {editDisplayName.length}/30
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed px-1">
                  Note: You can only change your display name once every 30 days.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">
                  Bio
                </label>
                <div className="relative">
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell students about yourself..."
                    className="w-full bg-[var(--inset-bg)] border border-[var(--glass-border)] rounded-2xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-all h-28 resize-none"
                    maxLength={150}
                  />
                  <div className="absolute right-4 bottom-3 text-[10px] text-[var(--text-secondary)] font-mono">
                    {editBio.length}/150
                  </div>
                </div>
              </div>

              {profileError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium animate-shake">
                  {profileError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-3 rounded-2xl inset-control text-xs font-bold text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex-1 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-pressed)] text-[var(--accent-dark)] text-xs font-bold shadow-lg shadow-[var(--accent)]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingProfile ? (
                    <div className="w-4 h-4 border-2 border-[var(--accent-dark)] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
