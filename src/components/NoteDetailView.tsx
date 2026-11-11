import React from 'react';
import { ArrowLeft, Share2, Sparkles } from 'lucide-react';
import { StudyNote, StudentUser } from '../types';
import { NoteCard } from './NoteCard';

interface NoteDetailViewProps {
  note: StudyNote;
  currentUser: StudentUser | null;
  onRequireAuth: () => void;
  onGoBack: () => void;
  studentAvatars?: Record<string, string>;
  studentNames?: Record<string, string>;
  onOpenProfile?: (username: string) => void;
  onOpenLightbox?: (urls: string[], index: number, title: string) => void;
}

export const NoteDetailView: React.FC<NoteDetailViewProps> = ({
  note,
  currentUser,
  onRequireAuth,
  onGoBack,
  studentAvatars,
  studentNames,
  onOpenProfile,
  onOpenLightbox,
}) => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      {/* Top Header Back Navigation Control */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onGoBack}
          className="inset-control px-4 py-2 rounded-full text-xs font-semibold text-[var(--text)] hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer shadow-md"
        >
          <ArrowLeft size={16} className="text-[var(--accent)]" />
          <span>Back to Screen</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
          <Sparkles size={14} className="text-[var(--accent)]" />
          <span>Post View</span>
        </div>
      </div>

      {/* Main Interactive Note Card */}
      <NoteCard
        note={note}
        currentUser={currentUser}
        onRequireAuth={onRequireAuth}
        studentAvatars={studentAvatars}
        studentNames={studentNames}
        onOpenProfile={onOpenProfile}
        onOpenLightbox={onOpenLightbox}
        defaultExpandComments={true}
      />
    </div>
  );
};
