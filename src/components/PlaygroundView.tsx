import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Plus,
  Search,
  Image as ImageIcon,
  X,
  Trash2,
  MessageSquare,
  Reply,
  Send,
  CornerDownRight,
  Download,
  ChevronLeft,
  ChevronRight,
  Images,
  Video,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudyNote, StudentUser, NoteComment, ReactionType, REACTION_EMOJIS } from '../types';
import {
  createStudyNote,
  toggleLikeNote,
  toggleNoteReaction,
  deleteStudyNote,
  addNoteComment,
  deleteNoteComment,
  subscribeToNoteComments,
} from '../services/firebase';
import { ReactionPicker } from './ReactionPicker';
import { ReactionModal } from './ReactionModal';
import { NoteCard } from './NoteCard';
import { compressImage } from '../utils/imageCompressor';
import { compressVideo } from '../utils/videoCompressor';

interface PlaygroundViewProps {
  notes: StudyNote[];
  currentUser: StudentUser | null;
  onRequireAuth: () => void;
  onNoteCreated?: () => void;
  studentAvatars?: Record<string, string>;
  studentNames?: Record<string, string>;
  onOpenProfile?: (username: string) => void;
  onSelectNote?: (noteId: string) => void;
}

// Helper component for Facebook-style multi-photo grid collage with photo count indicators
const NotePhotoGrid: React.FC<{
  urls: string[];
  title: string;
  onOpenLightbox: (index: number) => void;
  onDownload: (url: string) => void;
}> = ({ urls, title, onOpenLightbox, onDownload }) => {
  if (!urls || urls.length === 0) return null;

  if (urls.length === 1) {
    return (
      <div className="mb-4 rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black/20 relative group">
        <img
          src={urls[0]}
          alt={title}
          onClick={() => onOpenLightbox(0)}
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
              onClick={() => onOpenLightbox(idx)}
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
            onClick={() => onOpenLightbox(0)}
            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer block"
            loading="lazy"
          />
        </div>
        <div className="relative w-full h-full overflow-hidden bg-black/30">
          <img
            src={urls[1]}
            alt={`${title} - 2`}
            onClick={() => onOpenLightbox(1)}
            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer block"
            loading="lazy"
          />
        </div>
        <div className="relative w-full h-full overflow-hidden bg-black/30">
          <img
            src={urls[2]}
            alt={`${title} - 3`}
            onClick={() => onOpenLightbox(2)}
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
              onClick={() => onOpenLightbox(idx)}
              className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer block"
              loading="lazy"
            />
            {isFourth && moreCount > 1 && (
              <div
                onClick={() => onOpenLightbox(3)}
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


export const PlaygroundView: React.FC<PlaygroundViewProps> = ({
  notes,
  currentUser,
  onRequireAuth,
  onNoteCreated,
  studentAvatars,
  studentNames,
  onOpenProfile,
  onSelectNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Note creator form state supporting up to 20+ attached photos
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory] = useState('General');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedVideo, setAttachedVideo] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fullscreen Lightbox state
  const [lightboxState, setLightboxState] = useState<{
    urls: string[];
    index: number;
    title: string;
  } | null>(null);

  // Facebook-style "Who Upvoted" Likers modal state
  const [likersNoteId, setLikersNoteId] = useState<string | null>(null);

  // Active expanded comments by noteId
  const [expandedCommentsNoteId, setExpandedCommentsNoteId] = useState<string | null>(null);

  // Reaction popover & breakdown modal state
  const [activeReactionPickerNoteId, setActiveReactionPickerNoteId] = useState<string | null>(null);
  const [activeReactionModalNote, setActiveReactionModalNote] = useState<StudyNote | null>(null);

  // Note delete confirmation state
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectReaction = async (note: StudyNote, rType: ReactionType) => {
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
      setActiveReactionPickerNoteId(null);
    }
  };

  // Filter notes by search query
  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.authorUsername.toLowerCase().includes(q) ||
      n.authorDisplayName.toLowerCase().includes(q)
    );
  });

  // Handle multi-image or video upload with silent client-side compressor
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsCompressing(true);
    setErrorMessage(null);

    try {
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      const videoFiles = files.filter(f => f.type.startsWith('video/'));

      if (videoFiles.length > 0) {
        // Handle single video compression for now
        const videoRes = await compressVideo(videoFiles[0], {
          maxWidth: 480,
          maxHeight: 480,
          videoBitsPerSecond: 600000
        });
        
        if (videoRes.compressedSize > 980_000) {
          throw new Error('Video is too large even after compression (limit 1MB). Try a shorter clip.');
        }
        
        setAttachedVideo(videoRes.dataUrl);
      }

      if (imageFiles.length > 0) {
        const compressedResults = await Promise.all(
          imageFiles.map((file) =>
            compressImage(file, {
              maxDimension: 850,
              quality: 0.70,
              maxSizeBytes: 65_000,
              mimeType: 'image/webp',
            })
          )
        );
        const newUrls = compressedResults.map((r) => r.dataUrl);
        setAttachedImages((prev) => [...prev, ...newUrls].slice(0, 25)); // Cap at 25 photos
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process media';
      setErrorMessage(msg);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachedImage = (indexToRemove: number) => {
    setAttachedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    if (!noteTitle.trim() || !noteContent.trim()) {
      setErrorMessage('Please fill in both title and note content.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createStudyNote({
        title: noteTitle,
        content: noteContent,
        authorUsername: currentUser.username,
        authorDisplayName: currentUser.displayName,
        authorAvatar:
          (studentAvatars && studentAvatars[currentUser.username.toLowerCase()]) ||
          currentUser.avatarUrl,
        categoryTag: '',
        imageUrl: attachedImages[0] || undefined,
        imageUrls: attachedImages.length > 0 ? attachedImages : undefined,
        videoUrl: attachedVideo || undefined,
      });

      setNoteTitle('');
      setNoteContent('');
      setAttachedImages([]);
      setAttachedVideo(null);
      setIsModalOpen(false);

      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // Safe fallback
      }

      onNoteCreated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish note';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (note: StudyNote) => {
    if (!currentUser || currentUser.username !== note.authorUsername) {
      return;
    }

    try {
      await deleteStudyNote(note.id, note.authorUsername);
      setDeletingNoteId(null);
      if (expandedCommentsNoteId === note.id) {
        setExpandedCommentsNoteId(null);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const handleLike = async (note: StudyNote) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    try {
      await toggleLikeNote(note.id, currentUser.username);
    } catch (err) {
      console.error('Error toggling upvote:', err);
    }
  };

  const handleDownloadImage = (dataUrl: string, title: string) => {
    try {
      const link = document.createElement('a');
      link.href = dataUrl;
      const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
      link.download = `genzportal-note-${cleanTitle || 'diagram'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const activeLikersNote = notes.find((n) => n.id === likersNoteId);

  return (
    <div className="space-y-6">
      {/* Search Bar & Primary Action */}
      <div className="glass-container p-4 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none z-10"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pill-input"
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>

          <button
            onClick={() => {
              if (!currentUser) {
                onRequireAuth();
              } else {
                setIsModalOpen(true);
              }
            }}
            className="btn-primary py-2.5 px-5 text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <Plus size={16} />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      {/* Posts Feed Grid */}
      {filteredNotes.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl space-y-3">
          <p className="text-sm font-semibold text-[var(--text)]">No posts found</p>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            {searchQuery
              ? 'Try searching with different keywords.'
              : 'Be the first to share a post with the community!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              currentUser={currentUser}
              onRequireAuth={onRequireAuth}
              studentAvatars={studentAvatars}
              studentNames={studentNames}
              onOpenProfile={onOpenProfile}
              onSelectNote={onSelectNote}
              onOpenLightbox={(urls, index, title) =>
                setLightboxState({ urls, index, title })
              }
            />
          ))}
        </div>
      )}

      {/* Note Creator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-lg p-5 sm:p-6 rounded-3xl max-h-[88vh] flex flex-col shadow-2xl border border-white/20">
            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <h3 className="text-lg font-bold text-[var(--text)]">Create Post</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full inset-control flex items-center justify-center hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {errorMessage && (
              <div className="shrink-0 mb-3 p-2.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
                {errorMessage}
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateNote} className="flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto pr-1 flex-1 space-y-3.5 pb-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--text)] mb-1 px-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Post title..."
                    required
                    className="pill-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text)] mb-1 px-1">
                    Description
                  </label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={4}
                    placeholder="Write something..."
                    required
                    className="w-full rounded-2xl bg-[var(--inset-bg)] text-[var(--text)] border border-transparent p-3 text-xs focus:border-[var(--accent)] focus:outline-none"
                    style={{ boxShadow: 'var(--inset-shadow)' }}
                  />
                </div>

                {/* Photo/Video Attachment Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <label className="text-xs font-medium text-[var(--text)]">
                      Add Media { (attachedImages.length > 0 || attachedVideo) && `(${attachedImages.length + (attachedVideo ? 1 : 0)})`}
                    </label>
                  </div>

                  {(attachedImages.length > 0 || attachedVideo) ? (
                    <div className="space-y-2">
                      {/* Video Preview */}
                      {attachedVideo && (
                        <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video">
                          <video
                            src={attachedVideo}
                            className="w-full h-full object-cover"
                            controls
                            muted
                            playsInline
                          />
                          <button
                            type="button"
                            onClick={() => setAttachedVideo(null)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer z-10"
                            title="Remove video"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {/* Thumbnail Gallery Grid for Images */}
                      {attachedImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 bg-black/20 p-2.5 rounded-2xl border border-white/10 max-h-48 overflow-y-auto">
                          {attachedImages.map((imgUrl, i) => (
                            <div key={i} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10 bg-black/40">
                              <img src={imgUrl} alt={`Attached ${i + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachedImage(i)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Remove photo"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}

                          {attachedImages.length < 25 && (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isCompressing}
                              className="aspect-square rounded-xl border border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-[var(--accent)]"
                              title="Add more photos"
                            >
                              <Plus size={18} />
                              <span className="text-[9px] font-medium text-[var(--text-secondary)]">Add More</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressing}
                      className="w-full border border-dashed border-white/20 hover:border-white/40 rounded-2xl p-4 text-center transition-colors flex flex-col items-center justify-center gap-2 bg-black/10 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full inset-control flex items-center justify-center text-[var(--accent)]">
                        <ImageIcon size={18} />
                      </div>
                      <span className="text-xs font-medium text-[var(--text)] block">
                        {isCompressing ? 'Processing media...' : 'Add Photos or Video'}
                      </span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="shrink-0 pt-3 border-t border-white/10 flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inset-control px-4 py-2 text-xs font-medium hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCompressing}
                  className="btn-primary py-2 px-5 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Posting...' : 'Create Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Viewer with Download & Navigation */}
      {lightboxState && (
        <div className="fixed inset-0 z-[200] bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-4xl flex items-center justify-between text-white py-2 px-3">
            <div className="text-xs font-semibold flex items-center gap-2 truncate pr-2">
              <span className="text-[var(--accent)] truncate max-w-[200px] sm:max-w-xs">{lightboxState.title}</span>
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
                  setLightboxState((prev) => (prev ? { ...prev, index: prev.index - 1 } : null))
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
                    setLightboxState((prev) => (prev ? { ...prev, index: prev.index + 1 } : null))
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

      {/* Facebook "Who Upvoted" Likers List Modal */}
      {activeLikersNote && (
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-sm p-5 rounded-3xl space-y-4 border border-white/20">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Heart size={16} className="fill-rose-400" />
                <span>Students Who Upvoted</span>
              </div>
              <button
                onClick={() => setLikersNoteId(null)}
                className="w-8 h-8 rounded-full inset-control flex items-center justify-center hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {activeLikersNote.likedBy.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] text-center py-4">
                  No upvotes yet. Be the first student to upvote!
                </p>
              ) : (
                activeLikersNote.likedBy.map((username) => {
                  const avatar =
                    (studentAvatars && studentAvatars[username.toLowerCase()]) || '';
                  return (
                    <div
                      key={username}
                      onClick={() => {
                        setLikersNoteId(null);
                        onOpenProfile?.(username);
                      }}
                      className="p-2.5 rounded-2xl bg-[var(--inset-bg)] border border-[var(--glass-border)] flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={avatar}
                          alt={username}
                          className="w-7 h-7 rounded-full object-cover aspect-square border border-white/15 bg-black/40 shrink-0"
                        />
                        <span className="text-xs font-semibold text-[var(--text)] truncate">
                          @{username}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--accent)] font-medium">View Profile</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Multi-Emoji Reaction Breakdown Modal */}
      {activeReactionModalNote && (
        <ReactionModal
          isOpen={true}
          onClose={() => setActiveReactionModalNote(null)}
          reactions={activeReactionModalNote.reactions}
          likedBy={activeReactionModalNote.likedBy}
          studentAvatars={studentAvatars}
          onOpenProfile={onOpenProfile}
          noteTitle={activeReactionModalNote.title}
        />
      )}
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: EXPANDABLE COMMENTS & REPLIES
// WITH COMMENT & REPLY DELETION
// ==========================================

interface NoteCommentsSectionProps {
  note: StudyNote;
  currentUser: StudentUser | null;
  onRequireAuth: () => void;
  studentAvatars?: Record<string, string>;
  onOpenProfile?: (username: string) => void;
}

const NoteCommentsSection: React.FC<NoteCommentsSectionProps> = ({
  note,
  currentUser,
  onRequireAuth,
  studentAvatars,
  onOpenProfile,
}) => {
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

  const rootComments = comments.filter((c) => !c.replyToCommentId);
  const repliesByCommentId: Record<string, NoteComment[]> = {};
  for (const c of comments) {
    if (c.replyToCommentId) {
      if (!repliesByCommentId[c.replyToCommentId]) {
        repliesByCommentId[c.replyToCommentId] = [];
      }
      repliesByCommentId[c.replyToCommentId].push(c);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
      {/* Existing Comments List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-[11px] text-[var(--text-secondary)] italic text-center py-2">
            No comments yet. Be the first to leave a thought or question!
          </p>
        ) : (
          rootComments.map((root) => {
            const replies = repliesByCommentId[root.id] || [];
            const canDeleteRoot =
              currentUser &&
              (currentUser.username === root.authorUsername ||
                currentUser.username === note.authorUsername);

            return (
              <div key={root.id} className="space-y-2">
                {/* Root Comment */}
                <div className="p-3 rounded-2xl bg-[var(--comment-card-bg)] border border-[var(--comment-card-border)] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div
                      onClick={() => onOpenProfile?.(root.authorUsername)}
                      className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={
                          (studentAvatars &&
                            studentAvatars[root.authorUsername.toLowerCase()]) ||
                          root.authorAvatar
                        }
                        alt={root.authorDisplayName}
                        className="w-5 h-5 rounded-full object-cover aspect-square shrink-0"
                      />
                      <span className="font-semibold text-[var(--text)] truncate">
                        {root.authorDisplayName}
                      </span>
                      <span className="text-[var(--text-secondary)] text-[10px]">
                        @{root.authorUsername}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleStartReply(root.id, root.authorUsername)}
                        className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-[var(--inset-bg)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                      >
                        <Reply size={11} />
                        <span>Reply</span>
                      </button>

                      {/* Comment Deletion for Author or Note Owner */}
                      {canDeleteRoot && (
                        <div>
                          {deletingCommentId === root.id ? (
                            <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/40 px-2 py-0.5 rounded-full text-[10px]">
                              <span className="text-red-200">Delete?</span>
                              <button
                                onClick={() => handleDeleteComment(root.id)}
                                className="text-red-300 font-bold hover:underline px-1 cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeletingCommentId(null)}
                                className="text-slate-300 hover:underline px-1 cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingCommentId(root.id)}
                              className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                              title="Delete comment"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text)] pl-6 leading-relaxed">
                    {root.text}
                  </p>
                </div>

                {/* Nested Replies with Delete Action */}
                {replies.length > 0 && (
                  <div className="pl-5 space-y-2 border-l-2 border-[var(--glass-border)] ml-3">
                    {replies.map((reply) => {
                      const canDeleteReply =
                        currentUser &&
                        (currentUser.username === reply.authorUsername ||
                          currentUser.username === note.authorUsername);

                      return (
                        <div
                          key={reply.id}
                          className="p-2.5 rounded-xl bg-[var(--reply-card-bg)] border border-[var(--reply-card-border)] space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <div
                              onClick={() => onOpenProfile?.(reply.authorUsername)}
                              className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <CornerDownRight size={11} className="text-[var(--accent)] shrink-0" />
                              <img
                                src={
                                  (studentAvatars &&
                                    studentAvatars[reply.authorUsername.toLowerCase()]) ||
                                  reply.authorAvatar
                                }
                                alt={reply.authorDisplayName}
                                className="w-4 h-4 rounded-full object-cover aspect-square shrink-0"
                              />
                              <span className="font-semibold text-[var(--text)] truncate">
                                {reply.authorDisplayName}
                              </span>
                              <span className="text-[var(--text-secondary)]">
                                @{reply.authorUsername}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleStartReply(root.id, reply.authorUsername)}
                                className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <Reply size={10} />
                                <span>Reply</span>
                              </button>

                              {/* Sub-reply Deletion */}
                              {canDeleteReply && (
                                <div>
                                  {deletingCommentId === reply.id ? (
                                    <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/40 px-1.5 py-0.5 rounded-full text-[9px]">
                                      <span className="text-red-200">Delete?</span>
                                      <button
                                        onClick={() => handleDeleteComment(reply.id)}
                                        className="text-red-300 font-bold hover:underline px-0.5 cursor-pointer"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setDeletingCommentId(null)}
                                        className="text-slate-300 hover:underline px-0.5 cursor-pointer"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeletingCommentId(reply.id)}
                                      className="text-slate-400 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                                      title="Delete reply"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-[var(--text)] pl-5 leading-relaxed">
                            {reply.replyToUsername && (
                              <span className="text-[var(--accent)] font-medium mr-1.5">
                                @{reply.replyToUsername}
                              </span>
                            )}
                            {reply.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reply indicator banner */}
      {replyTarget && (
        <div className="flex items-center justify-between px-3 py-1 bg-white/10 rounded-full text-[11px] text-[var(--text)]">
          <span>
            Replying to <span className="font-semibold text-[var(--accent)]">@{replyTarget.username}</span>
          </span>
          <button
            onClick={() => setReplyTarget(null)}
            className="text-[10px] text-slate-300 hover:text-white px-1 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Comment Input */}
      <form
        onSubmit={handlePostComment}
        className="flex items-center gap-1.5 bg-[var(--inset-bg)] p-1 pl-3 rounded-full border border-[var(--glass-border)] focus-within:border-[var(--accent)]"
      >
        <input
          ref={commentInputRef}
          type="text"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          placeholder={
            replyTarget
              ? `Reply to @${replyTarget.username}...`
              : 'Write a comment...'
          }
          className="flex-1 bg-transparent border-none text-xs text-[var(--text)] placeholder:text-[var(--text-secondary)] p-1 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!commentInput.trim() || isSending}
          className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--accent-dark)] flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-[var(--accent-pressed)] transition-colors cursor-pointer"
          aria-label="Post comment"
        >
          <Send size={13} strokeWidth={2.5} className="text-[var(--accent-dark)]" />
        </button>
      </form>
    </div>
  );
};
