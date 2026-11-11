import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Trophy,
  Heart,
  FileText,
  Share2,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  Camera,
  Upload,
} from 'lucide-react';
import { StudentUser, StudyNote } from '../types';
import {
  getStudentByUsername,
  recordProfileView,
  computeLeaderboardFromNotes,
  updateStudentCoverPhoto,
  updateStudentAvatar,
} from '../services/firebase';
import { NoteCard } from './NoteCard';
import { compressImage } from '../utils/imageCompressor';
import { formatCompactNumber } from '../utils/numberFormatter';

interface StudentProfileViewProps {
  username: string | null;
  currentUser: StudentUser | null;
  allNotes: StudyNote[];
  studentAvatars?: Record<string, string>;
  studentNames?: Record<string, string>;
  onGoBack: () => void;
  onRequireAuth?: () => void;
  onSelectNote?: (noteId: string) => void;
  onOpenProfile?: (username: string) => void;
  onUserUpdated?: (user: StudentUser) => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  username,
  currentUser,
  allNotes,
  studentAvatars,
  studentNames,
  onGoBack,
  onRequireAuth,
  onSelectNote,
  onOpenProfile,
  onUserUpdated,
}) => {
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [localCover, setLocalCover] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const recordedViewRef = useRef<string | null>(null);

  // Fullscreen Lightbox viewer state
  const [lightboxState, setLightboxState] = useState<{
    urls: string[];
    index: number;
    title: string;
  } | null>(null);

  // Handle uploading and updating student cover photo
  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploadingCover(true);
    try {
      const res = await compressImage(file, {
        maxDimension: 960,
        quality: 0.72,
        maxSizeBytes: 75_000,
        mimeType: 'image/webp',
      });

      setLocalCover(res.dataUrl);
      await updateStudentCoverPhoto(currentUser.username, res.dataUrl, 50);
    } catch (err) {
      console.error('Failed to update cover photo:', err);
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = '';
      }
    }
  };


  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUpdatingAvatar(true);
    try {
      const res = await compressImage(file, {
        maxDimension: 320,
        quality: 0.75,
        maxSizeBytes: 40_000,
        mimeType: 'image/webp',
      });

      const updatedUser = {
        ...currentUser,
        avatarUrl: res.dataUrl,
      };
      
      onUserUpdated?.(updatedUser);
      await updateStudentAvatar(currentUser.username, res.dataUrl);
    } catch (err) {
      console.error('Failed to update avatar:', err);
    } finally {
      setIsUpdatingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  // Load student profile document strictly when username changes
  useEffect(() => {
    if (!username) {
      setStudent(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getStudentByUsername(username).then((data) => {
      if (!isMounted) return;
      if (data) {
        setStudent(data);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [username]);

  // Record profile view once per user visit without re-triggering on note changes
  useEffect(() => {
    if (!username || !currentUser) return;
    const viewKey = `${currentUser.username.toLowerCase()}->${username.toLowerCase()}`;
    if (
      currentUser.username.toLowerCase() !== username.toLowerCase() &&
      recordedViewRef.current !== viewKey
    ) {
      recordedViewRef.current = viewKey;
      recordProfileView(username, currentUser);
    }
  }, [username, currentUser?.username]);

  // Memoize filtered notes so reactions and comments update smoothly in place without re-rendering loading state
  const userNotes = useMemo(
    () =>
      username
        ? allNotes.filter((n) => n.authorUsername.toLowerCase() === username.toLowerCase())
        : [],
    [allNotes, username]
  );

  const totalUpvotesReceived = useMemo(
    () => userNotes.reduce((acc, curr) => acc + (curr.likesCount || 0), 0),
    [userNotes]
  );

  const top10 = useMemo(
    () => computeLeaderboardFromNotes(allNotes, studentAvatars, studentNames),
    [allNotes, studentAvatars, studentNames]
  );

  const userRank = useMemo(
    () =>
      username
        ? top10.find((item) => item.username.toLowerCase() === username.toLowerCase())
        : undefined,
    [top10, username]
  );

  // Fallback student profile if student doc not yet found
  const displayStudent = useMemo<StudentUser | null>(() => {
    if (student) return student;
    if (!username) return null;
    const authorNote = userNotes[0];
    if (authorNote) {
      return {
        id: authorNote.authorUsername,
        username: authorNote.authorUsername,
        displayName: authorNote.authorDisplayName,
        avatarUrl: authorNote.authorAvatar,
        coverUrl:
          currentUser?.username.toLowerCase() === username.toLowerCase()
            ? currentUser.coverUrl
            : undefined,
        coverPositionY:
          currentUser?.username.toLowerCase() === username.toLowerCase()
            ? currentUser.coverPositionY
            : undefined,
        bio: 'Gen-Z student exploring new study hacks and sharing notes.',
        totalLikesReceived: totalUpvotesReceived,
        totalNotesShared: userNotes.length,
        createdAt: authorNote.createdAt,
      };
    }
    return null;
  }, [student, username, userNotes, totalUpvotesReceived, currentUser]);

  const effectiveDisplayName =
    (username && studentNames && studentNames[username.toLowerCase()]) ||
    (displayStudent ? displayStudent.displayName : `@${username}`);

  if (!username) return null;

  const isOwner = currentUser?.username.toLowerCase() === username?.toLowerCase();
  const activeCover = localCover || displayStudent?.coverUrl;
  const activeCoverPosition = displayStudent?.coverPositionY ?? 50;

  const activeAvatar =
    (studentAvatars && studentAvatars[username.toLowerCase()]) ||
    displayStudent?.avatarUrl ||
    'https://api.dicebear.com/7.x/bottts/svg?seed=' + username;

  const handleDownloadImage = async (url: string, titleStr: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const isVideo = blob.type.startsWith('video/');
      const extension = isVideo ? 'webm' : 'webp';
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `GenZ_Post_${titleStr.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] text-[var(--text)] overflow-y-auto flex flex-col selection:bg-[var(--accent)] selection:text-[var(--accent-dark)] animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[var(--bg)]/90 border-b border-[var(--glass-border)] h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onGoBack}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full inset-control flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text)] transition-transform active:scale-95 cursor-pointer shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft size={18} className="text-[var(--accent)]" />
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-[var(--text)] leading-tight truncate">
              {effectiveDisplayName}
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)] leading-none truncate">
              {userNotes.length} {userNotes.length === 1 ? 'post' : 'posts'} · Student Profile
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {userRank && (
            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-xs font-bold text-[var(--accent)]">
              <Trophy size={13} />
              <span>Rank #{userRank.rank < 10 ? `0${userRank.rank}` : userRank.rank}</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area: Profile & Post Feed */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        {loading && !displayStudent ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[var(--text-secondary)]">Loading student profile...</p>
          </div>
        ) : displayStudent ? (
          <>
            {/* Profile Header Card */}
            <div className="glass-card rounded-3xl overflow-hidden border border-[var(--glass-border)] shadow-xl">
              {/* Cover Photo Area */}
              <div className="h-40 sm:h-56 w-full bg-gradient-to-r from-blue-900/40 via-purple-900/35 to-slate-900/50 border-b border-white/10 relative overflow-hidden select-none">
                {/* Cover Image */}
                {activeCover ? (
                  <img
                    src={activeCover}
                    alt="Cover banner"
                    style={{
                      objectPosition: `center ${activeCoverPosition}%`,
                    }}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-950/70 via-purple-950/60 to-slate-900/80" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                {/* Edit Cover Photo Button (Only if profile owner) */}
                {isOwner && (
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={isUploadingCover}
                      className="px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/25 transition-all cursor-pointer shadow-xl active:scale-95"
                      title="Upload or change cover photo"
                    >
                      <Camera size={14} className="text-[var(--accent)]" />
                      <span>
                        {isUploadingCover
                          ? 'Uploading...'
                          : activeCover
                          ? 'Change Cover'
                          : 'Add Cover Photo'}
                      </span>
                    </button>
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverPhotoChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Profile Details Container */}
              <div className="px-5 sm:px-7 pb-6 pt-0">
                {/* Overlapping Avatar */}
                <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
                  <div className="relative group/avatar w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-[var(--bg)] shadow-2xl bg-black/40 relative">
                      <img
                        src={activeAvatar}
                        alt={displayStudent.displayName}
                        className="w-full h-full object-cover aspect-square"
                      />

                      {/* Change Avatar Button (Owner only) */}
                      {isOwner && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUpdatingAvatar}
                          className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                          title="Change Profile Photo"
                        >
                          <Upload size={18} className="mb-0.5" />
                          <span>{isUpdatingAvatar ? '...' : 'Edit'}</span>
                        </button>
                      )}
                    </div>

                    {isOwner && (
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    )}

                    {userRank && (
                      <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--accent-dark)] flex items-center justify-center font-bold text-xs shadow-md border-2 border-[var(--bg)] z-10">
                        {userRank.rank}
                      </div>
                    )}
                  </div>

                  <div className="text-center sm:text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full inset-control text-xs text-[var(--text-secondary)]">
                      <Calendar size={13} />
                      <span>Joined {new Date(displayStudent.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                    </span>
                  </div>
                </div>

                {/* Identity & Bio */}
                <div className="text-center sm:text-left space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text)] tracking-tight">
                    {effectiveDisplayName}
                  </h2>
                  <div className="text-xs sm:text-sm text-[var(--accent)] font-medium">
                    @{displayStudent.username}
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed pt-1.5 max-w-xl">
                    {displayStudent.bio || 'Gen-Z student exploring new study concepts and sharing notes.'}
                  </p>
                </div>

                {/* 3-Column Metrics Grid */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mt-5 pt-5 border-t border-[var(--glass-border)]">
                  <div className="p-3 rounded-2xl bg-[var(--inset-bg)] border border-[var(--glass-border)] text-center">
                    <div className="text-lg sm:text-xl font-bold font-mono text-[var(--accent)]">
                      {userRank ? `#0${userRank.rank}` : '#--'}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase tracking-wider mt-0.5 font-medium">
                      Top Rank
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--inset-bg)] border border-[var(--glass-border)] text-center overflow-hidden">
                    <div 
                      className="text-lg sm:text-xl font-bold font-mono text-rose-400 truncate"
                      title={totalUpvotesReceived.toLocaleString()}
                    >
                      {formatCompactNumber(totalUpvotesReceived)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase tracking-wider mt-0.5 font-medium truncate">
                      Upvotes
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--inset-bg)] border border-[var(--glass-border)] text-center overflow-hidden">
                    <div 
                      className="text-lg sm:text-xl font-bold font-mono text-[var(--text)] truncate"
                      title={userNotes.length.toLocaleString()}
                    >
                      {formatCompactNumber(userNotes.length)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase tracking-wider mt-0.5 font-medium truncate">
                      Posts
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Facebook-Style Feed Header */}
            <div className="flex items-center justify-between px-1 pt-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text)] tracking-tight">
                  Published Posts ({userNotes.length})
                </h3>
              </div>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Feed stream
              </span>
            </div>

            {/* Post Feed List */}
            {userNotes.length === 0 ? (
              <div className="glass-card p-10 rounded-3xl text-center space-y-2 border border-[var(--glass-border)]">
                <p className="text-sm font-semibold text-[var(--text)]">No posts published yet</p>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  This student hasn't shared any posts yet. Check back soon!
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {userNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    currentUser={currentUser}
                    onRequireAuth={onRequireAuth || (() => {})}
                    studentAvatars={studentAvatars}
                    studentNames={studentNames}
                    onOpenProfile={(u) => {
                      if (onOpenProfile) {
                        onOpenProfile(u);
                      }
                    }}
                    onSelectNote={onSelectNote}
                    onOpenLightbox={(urls, index, title) =>
                      setLightboxState({ urls, index, title })
                    }
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="py-20 text-center text-xs text-[var(--text-secondary)]">
            Student profile not found.
          </div>
        )}
      </main>

      {/* Fullscreen Lightbox Viewer with Download & Navigation */}
      {lightboxState && (
        <div className="fixed inset-0 z-[200] bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-4xl flex items-center justify-between text-white py-2 px-3">
            <div className="text-xs font-semibold flex items-center gap-2 truncate pr-2">
              <span className="text-[var(--accent)] truncate max-w-[200px] sm:max-w-xs">
                {lightboxState.title}
              </span>
              <span>·</span>
              <span className="shrink-0 font-mono">
                Photo {lightboxState.index + 1} of {lightboxState.urls.length}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() =>
                  handleDownloadImage(
                    lightboxState.urls[lightboxState.index],
                    `${lightboxState.title}_${lightboxState.index + 1}`
                  )
                }
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download photo"
              >
                <Download size={14} className="text-[var(--accent)]" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={() => setLightboxState(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                title="Close viewer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center my-2 overflow-hidden">
            {lightboxState.urls.length > 1 && lightboxState.index > 0 && (
              <button
                onClick={() =>
                  setLightboxState((prev) =>
                    prev ? { ...prev, index: prev.index - 1 } : null
                  )
                }
                className="absolute left-2 sm:left-4 z-10 w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center border border-white/20 transition-transform active:scale-95 cursor-pointer shadow-xl"
                title="Previous photo"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img
              src={lightboxState.urls[lightboxState.index]}
              alt={`Photo ${lightboxState.index + 1}`}
              className="max-h-[76vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-200"
            />

            {lightboxState.urls.length > 1 &&
              lightboxState.index < lightboxState.urls.length - 1 && (
                <button
                  onClick={() =>
                    setLightboxState((prev) =>
                      prev ? { ...prev, index: prev.index + 1 } : null
                    )
                  }
                  className="absolute right-2 sm:right-4 z-10 w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center border border-white/20 transition-transform active:scale-95 cursor-pointer shadow-xl"
                  title="Next photo"
                >
                  <ChevronRight size={24} />
                </button>
              )}
          </div>

          {lightboxState.urls.length > 1 && (
            <div className="w-full max-w-xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-2 scrollbar-none">
              {lightboxState.urls.map((url, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setLightboxState((prev) => (prev ? { ...prev, index: i } : null))
                  }
                  className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    i === lightboxState.index
                      ? 'border-[var(--accent)] scale-110 shadow-md opacity-100'
                      : 'border-white/20 opacity-50 hover:opacity-90'
                  }`}
                >
                  <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
