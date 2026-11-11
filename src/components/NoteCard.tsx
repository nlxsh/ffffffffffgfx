import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Trash2,
  MessageSquare,
  Download,
  Reply,
  Send,
  X,
  CornerDownRight,
  Globe,
  Images,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudyNote, StudentUser, NoteComment, ReactionType, REACTION_EMOJIS } from '../types';
import {
  toggleNoteReaction,
  deleteStudyNote,
  addNoteComment,
  deleteNoteComment,
  subscribeToNoteComments,
} from '../services/firebase';
import { formatFacebookPostTime } from '../utils/dateFormatter';
import { formatCompactNumber } from '../utils/numberFormatter';
import { ReactionPicker } from './ReactionPicker';
import { ReactionModal } from './ReactionModal';

interface NoteCardProps {
  note: StudyNote;
  currentUser: StudentUser | null;
  onRequireAuth: () => void;
  studentAvatars?: Record<string, string>;
  studentNames?: Record<string, string>;
  onOpenProfile?: (username: string) => void;
  onOpenLightbox?: (urls: string[], index: number, title: string) => void;
  onSelectNote?: (noteId: string) => void;
  defaultExpandComments?: boolean;
}

// Facebook-style multi-photo grid collage helper with photo count indicators
const NotePhotoGrid: React.FC<{
  urls: string[];
  title: string;
  onOpenLightbox?: (index: number) => void;
  onDownload: (url: string) => void;
}> = ({ urls, title, onOpenLightbox, onDownload }) => {
  if (!urls || urls.length === 0) return null;

  // Single photo
  if (urls.length === 1) {
    return (
      <div className="mb-4 rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black/20 relative group">
        <img
          src={urls[0]}
          alt={title}
          onClick={() => onOpenLightbox?.(0)}
          className="w-full max-h-80 sm:max-h-96 object-cover hover:scale-[1.01] transition-transform duration-300 cursor-pointer block"
          loading="lazy"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(urls[0]);
          }}
          className="absolute top-2.5 right-2.5 px-2.5 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-[var(--text)] text-xs flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
          title="Download photo to gallery"
        >
          <Download size={13} className="text-[var(--accent)]" />
          <span className="text-[11px] font-medium">Download</span>
        </button>
      </div>
    );
  }

  // 2 photos side-by-side: Equal 50/50 width, unified height, zero empty black void
  if (urls.length === 2) {
    return (
      <div className="mb-4 rounded-2xl overflow-hidden border border-[var(--glass-border)] grid grid-cols-2 gap-1.5 aspect-[16/10] sm:aspect-[16/9] w-full relative group">
        {urls.slice(0, 2).map((url, idx) => (
          <div key={idx} className="relative w-full h-full overflow-hidden bg-black/30">
            <img
              src={url}
              alt={`${title} - ${idx + 1}`}
              onClick={() => onOpenLightbox?.(idx)}
              className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer block"
              loading="lazy"
            />
          </div>
        ))}
        {/* Photo count indicator badge */}
        <div className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1.5 border border-white/20 shadow-lg pointer-events-none">
          <Images size={13} className="text-[var(--accent)]" />
          <span>2 photos</span>
        </div>
      </div>
    );
  }

  // 3 photos: 1 wide featured photo on top, 2 photos side-by-side below
  if (urls.length === 3) {
    return (
      <div className="mb-4 rounded-2xl overflow-hidden border border-[var(--glass-border)] grid grid-cols-2 grid-rows-2 gap-1.5 aspect-[16/10] sm:aspect-[16/9] w-full relative group">
        <div className="col-span-2 relative w-full h-full overflow-hidden bg-black/30">
          <img
            src={urls[0]}
            alt={`${title} - 1`}
            onClick={() => onOpenLightbox?.(0)}
            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer block"
            loading="lazy"
          />
        </div>
        <div className="relative w-full h-full overflow-hidden bg-black/30">
          <img
            src={urls[1]}
            alt={`${title} - 2`}
            onClick={() => onOpenLightbox?.(1)}
            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer block"
            loading="lazy"
          />
        </div>
        <div className="relative w-full h-full overflow-hidden bg-black/30">
          <img
            src={urls[2]}
            alt={`${title} - 3`}
            onClick={() => onOpenLightbox?.(2)}
            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer block"
            loading="lazy"
          />
        </div>
        {/* Photo count indicator badge */}
        <div className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1.5 border border-white/20 shadow-lg pointer-events-none">
          <Images size={13} className="text-[var(--accent)]" />
          <span>3 photos</span>
        </div>
      </div>
    );
  }

  // 4 or more photos: 2x2 grid collage with count badge and +N overlay on the 4th cell
  const moreCount = urls.length - 3;
  return (
    <div className="mb-4 rounded-2xl overflow-hidden border border-[var(--glass-border)] grid grid-cols-2 grid-rows-2 gap-1.5 aspect-[16/10] sm:aspect-[16/9] w-full relative group">
      {urls.slice(0, 4).map((url, idx) => {
        const isFourth = idx === 3;
        return (
          <div key={idx} className="relative w-full h-full overflow-hidden bg-black/30">
            <img
              src={url}
              alt={`${title} - ${idx + 1}`}
              onClick={() => onOpenLightbox?.(idx)}
              className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer block"
              loading="lazy"
            />
            {isFourth && moreCount > 1 && (
              <div
                onClick={() => onOpenLightbox?.(3)}
                className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white cursor-pointer hover:bg-black/75 transition-colors"
              >
                <span className="text-xl sm:text-2xl font-bold font-mono">+{moreCount}</span>
                <span className="text-[11px] font-medium opacity-80 mt-0.5">more photos</span>
              </div>
            )}
          </div>
        );
      })}
      {/* Photo count indicator badge */}
      <div className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1.5 border border-white/20 shadow-lg pointer-events-none">
        <Images size={13} className="text-[var(--accent)]" />
        <span>{urls.length} photos</span>
      </div>
    </div>
  );
};

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  currentUser,
  onRequireAuth,
  studentAvatars,
  studentNames,
  onOpenProfile,
  onOpenLightbox,
  onSelectNote,
  defaultExpandComments = false,
}) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(defaultExpandComments);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const isAuthor = currentUser?.username === note.authorUsername;
  const authorDisplayName =
    (studentNames && studentNames[note.authorUsername.toLowerCase()]) ||
    (currentUser && currentUser.username.toLowerCase() === note.authorUsername.toLowerCase()
      ? currentUser.displayName
      : note.authorDisplayName);
  const myReactionType: ReactionType | null =
    currentUser && note.reactions && note.reactions[currentUser.username]
      ? note.reactions[currentUser.username]
      : null;

  const rawImages =
    note.imageUrls && note.imageUrls.length > 0
      ? note.imageUrls
      : note.imageUrl
      ? [note.imageUrl]
      : [];
  const noteImages = rawImages.filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0
  );

  const handleSelectReaction = async (rType: ReactionType) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    try {
      await toggleNoteReaction({
        noteId: note.id,
        user: currentUser,
        reactionType: rType,
      });

      confetti({
        particleCount: 20,
        spread: 40,
        origin: { y: 0.8 },
      });
    } catch (err) {
      console.error('Error selecting reaction:', err);
    } finally {
      setIsPickerOpen(false);
    }
  };

  const handleDeleteNote = async () => {
    try {
      await deleteStudyNote(note.id, note.authorUsername);
      setDeletingNoteId(null);
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

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
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  const timeMeta = formatFacebookPostTime(note.createdAt);

  return (
    <article className="glass-card p-5 sm:p-6 rounded-3xl flex flex-col justify-between hover:border-white/20 transition-all">
      <div>
        {/* Author Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div
            onClick={() => onOpenProfile?.(note.authorUsername)}
            className="flex items-center gap-3 min-w-0 cursor-pointer group"
          >
            <img
              src={
                (studentAvatars && studentAvatars[note.authorUsername.toLowerCase()]) ||
                note.authorAvatar
              }
              alt={authorDisplayName}
              className="w-8 h-8 rounded-full object-cover aspect-square border border-white/20 bg-black/30 shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--text)] leading-none truncate group-hover:text-[var(--accent)] transition-colors">
                {authorDisplayName}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5 truncate">
                <span className="truncate">@{note.authorUsername}</span>
                <span className="opacity-50">·</span>
                <span
                  title={timeMeta.fullDate}
                  className="hover:text-[var(--text)] flex items-center gap-1 cursor-default shrink-0"
                >
                  <span>{timeMeta.label}</span>
                  <Globe size={11} className="opacity-70 text-[var(--text-secondary)]" />
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthor && (
              <div className="relative ml-1">
                {deletingNoteId === note.id ? (
                  <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/40 p-1 px-2 rounded-full text-[10px]">
                    <span className="text-red-200">Delete?</span>
                    <button
                      onClick={handleDeleteNote}
                      className="text-red-300 font-bold hover:underline px-1 cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeletingNoteId(null)}
                      className="text-slate-300 hover:underline px-1 cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingNoteId(note.id)}
                    className="w-7 h-7 rounded-full inset-control flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title & Prose Content */}
        <h3
          onClick={() => onSelectNote?.(note.id)}
          className={`text-base font-bold text-[var(--text)] mb-2 leading-snug ${
            onSelectNote ? 'hover:text-[var(--accent)] cursor-pointer' : ''
          }`}
        >
          {note.title}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-4 mb-4 whitespace-pre-line">
          {note.content}
        </p>

        {/* Video Player if exists */}
        {note.videoUrl && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black/20 relative group aspect-video">
            <video
              src={note.videoUrl}
              className="w-full h-full object-cover"
              controls
              muted
              playsInline
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadImage(note.videoUrl!, note.title);
              }}
              className="absolute top-2.5 right-2.5 px-2.5 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-[var(--text)] text-xs flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95 z-10"
              title="Download video"
            >
              <Download size={13} className="text-[var(--accent)]" />
              <span className="text-[11px] font-medium">Download</span>
            </button>
          </div>
        )}

        {/* Multi-Photo Grid Collage */}
        <NotePhotoGrid
          urls={noteImages}
          title={note.title}
          onOpenLightbox={(idx) => onOpenLightbox?.(noteImages, idx, note.title)}
          onDownload={(url) => handleDownloadImage(url, note.title)}
        />
      </div>

      {/* Footer Actions: Multi-Emoji Reaction & Comment Drawer */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          {/* Reaction Trigger Button & Popover */}
          <div className="relative">
            {isPickerOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-30">
                <ReactionPicker
                  currentReaction={myReactionType || undefined}
                  onSelectReaction={(rType) => handleSelectReaction(rType)}
                  onClose={() => setIsPickerOpen(false)}
                />
              </div>
            )}

            <button
              onClick={() => {
                if (myReactionType) {
                  handleSelectReaction(myReactionType);
                } else {
                  setIsPickerOpen((prev) => !prev);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setIsPickerOpen(true);
              }}
              onTouchStart={() => {
                longPressTimer.current = window.setTimeout(() => {
                  setIsPickerOpen(true);
                }, 350);
              }}
              onTouchEnd={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
              onMouseEnter={() => setIsPickerOpen(true)}
              className={`inset-control px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                myReactionType
                  ? `bg-[var(--accent)]/15 border border-[var(--accent)]/30 font-bold ${REACTION_EMOJIS[myReactionType]?.color || 'text-[var(--accent)]'}`
                  : 'hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              {myReactionType ? (
                <span className="text-base leading-none">
                  {REACTION_EMOJIS[myReactionType]?.emoji || '👍'}
                </span>
              ) : (
                <Heart size={14} className="text-current" />
              )}
              <span>{myReactionType ? REACTION_EMOJIS[myReactionType]?.label : 'React'}</span>
            </button>
          </div>

          {/* Comment Sheet Toggle Button */}
          <button
            onClick={() => setIsCommentsOpen((prev) => !prev)}
            className={`inset-control px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isCommentsOpen
                ? 'bg-[var(--accent)]/15 text-[var(--text)]'
                : 'hover:bg-[var(--surface-hover)]'
            }`}
          >
            <MessageSquare size={14} />
            <span>{formatCompactNumber(note.commentsCount || 0)}</span>
            <span className="hidden sm:inline">Comments</span>
          </button>
        </div>

        {/* Facebook-style Reaction Breakdown Modal Link */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:underline cursor-pointer transition-colors flex items-center gap-1 shrink-0"
          title="See who reacted to this note"
        >
          {note.reactions && Object.keys(note.reactions).length > 0 && (
            <span className="flex items-center -space-x-1 text-sm mr-0.5">
              {Array.from(new Set(Object.values(note.reactions)))
                .slice(0, 3)
                .map((rKey, i) => (
                  <span key={i} className="drop-shadow-sm">
                    {REACTION_EMOJIS[rKey as ReactionType]?.emoji}
                  </span>
                ))}
            </span>
          )}
          <span>
            {note.likesCount === 1 ? '1 reaction' : `${formatCompactNumber(note.likesCount || 0)} reactions`}
          </span>
        </button>
      </div>

      {/* Expandable Comments Drawer */}
      {isCommentsOpen && (
        <CardCommentsSection
          note={note}
          currentUser={currentUser}
          onRequireAuth={onRequireAuth}
          studentAvatars={studentAvatars}
          studentNames={studentNames}
          onOpenProfile={onOpenProfile}
        />
      )}

      {/* Multi-Emoji Reaction Modal */}
      {isModalOpen && (
        <ReactionModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          reactions={note.reactions}
          likedBy={note.likedBy}
          studentAvatars={studentAvatars}
          studentNames={studentNames}
          onOpenProfile={onOpenProfile}
          noteTitle={note.title}
        />
      )}
    </article>
  );
};

// Internal Comments Section
const CardCommentsSection: React.FC<{
  note: StudyNote;
  currentUser: StudentUser | null;
  onRequireAuth: () => void;
  studentAvatars?: Record<string, string>;
  studentNames?: Record<string, string>;
  onOpenProfile?: (username: string) => void;
}> = ({ note, currentUser, onRequireAuth, studentAvatars, studentNames, onOpenProfile }) => {
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyTarget, setReplyTarget] = useState<{
    commentId: string;
    username: string;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToNoteComments(note.id, (loadedComments) => {
      setComments(loadedComments);
    });
    return () => unsubscribe();
  }, [note.id]);

  const handleStartReply = (commentId: string, username: string) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setReplyTarget({ commentId, username });
    commentInputRef.current?.focus();
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    const clean = commentInput.trim();
    if (!clean || isSending) return;

    setIsSending(true);

    try {
      await addNoteComment({
        noteId: note.id,
        text: clean,
        authorUsername: currentUser.username,
        authorDisplayName: currentUser.displayName,
        authorAvatar:
          (studentAvatars && studentAvatars[currentUser.username.toLowerCase()]) ||
          currentUser.avatarUrl,
        replyToCommentId: replyTarget ? replyTarget.commentId : null,
        replyToUsername: replyTarget ? replyTarget.username : null,
        noteAuthorUsername: note.authorUsername,
        noteTitle: note.title,
      });

      setCommentInput('');
      setReplyTarget(null);
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteNoteComment(note.id, commentId);
      setDeletingCommentId(null);
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-[var(--glass-border)] space-y-3 animate-in fade-in duration-200">
      <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] italic py-2 text-center">
            No comments yet. Be the first student to ask a question!
          </p>
        ) : (
          comments.map((comm) => {
            const avatar =
              (studentAvatars && studentAvatars[comm.authorUsername.toLowerCase()]) ||
              comm.authorAvatar;
            const commAuthor =
              (studentNames && studentNames[comm.authorUsername.toLowerCase()]) ||
              (currentUser && currentUser.username.toLowerCase() === comm.authorUsername.toLowerCase()
                ? currentUser.displayName
                : comm.authorDisplayName);
            const canDelete =
              currentUser?.username === comm.authorUsername ||
              currentUser?.username === note.authorUsername;

            return (
              <div key={comm.id} className="flex items-start gap-2.5 text-xs group">
                <img
                  src={avatar}
                  alt={commAuthor}
                  onClick={() => onOpenProfile?.(comm.authorUsername)}
                  className="w-7 h-7 rounded-full object-cover aspect-square border border-white/15 bg-black/30 shrink-0 mt-0.5 cursor-pointer hover:opacity-85"
                />

                <div className="flex-1 min-w-0 bg-[var(--inset-bg)] p-2.5 rounded-2xl border border-[var(--glass-border)]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <button
                        onClick={() => onOpenProfile?.(comm.authorUsername)}
                        className="font-bold text-[var(--text)] hover:underline truncate"
                      >
                        {commAuthor}
                      </button>
                      <span className="text-[10px] text-[var(--text-secondary)] truncate">
                        @{comm.authorUsername}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartReply(comm.id, comm.authorUsername)}
                        className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Reply size={10} />
                        <span>Reply</span>
                      </button>

                      {canDelete && (
                        <div className="relative ml-1">
                          {deletingCommentId === comm.id ? (
                            <div className="flex items-center gap-1 bg-red-950/90 border border-red-500/40 px-1.5 py-0.5 rounded-md text-[9px]">
                              <button
                                onClick={() => handleDeleteComment(comm.id)}
                                className="text-red-300 font-bold hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeletingCommentId(null)}
                                className="text-slate-300 hover:underline cursor-pointer ml-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingCommentId(comm.id)}
                              className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                              title="Delete comment"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {comm.replyToUsername && (
                    <div className="text-[10px] text-[var(--accent)] font-medium mb-1 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md w-fit">
                      <CornerDownRight size={10} />
                      <span>Replying to @{comm.replyToUsername}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-[var(--text)] leading-relaxed whitespace-pre-line">
                    {comm.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Active Banner */}
      {replyTarget && (
        <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between text-xs text-[var(--text)]">
          <div className="flex items-center gap-1.5 truncate">
            <Reply size={12} className="text-[var(--accent)] shrink-0" />
            <span className="font-medium text-[var(--accent)]">Replying to @{replyTarget.username}</span>
          </div>
          <button
            onClick={() => setReplyTarget(null)}
            className="w-4 h-4 rounded-full inset-control flex items-center justify-center hover:bg-white/20 shrink-0 ml-2"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Comment Form */}
      <form onSubmit={handlePostComment} className="flex items-center gap-2">
        <input
          ref={commentInputRef}
          type="text"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          placeholder={
            replyTarget
              ? `Reply to @${replyTarget.username}...`
              : currentUser
              ? 'Write a comment or question...'
              : 'Sign in to comment'
          }
          className="flex-1 bg-[var(--inset-bg)] border border-[var(--glass-border)] rounded-full px-3.5 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={!commentInput.trim() || isSending}
          className="w-8 h-8 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-pressed)] text-[var(--accent-dark)] flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer shadow-md"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
