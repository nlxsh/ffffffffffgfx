export interface StudentUser {
  id: string;
  username: string;
  displayName: string;
  password?: string;
  avatarUrl: string;
  coverUrl?: string;
  coverPositionY?: number;
  bio?: string;
  totalLikesReceived: number;
  totalNotesShared: number;
  lastDisplayNameUpdate?: number;
  createdAt: number;
}

export type ReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';

export const REACTION_EMOJIS: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  like: { emoji: '👍', label: 'Like', color: 'text-blue-500' },
  love: { emoji: '❤️', label: 'Love', color: 'text-rose-500' },
  care: { emoji: '🥰', label: 'Care', color: 'text-amber-400' },
  haha: { emoji: '😆', label: 'Haha', color: 'text-amber-400' },
  wow: { emoji: '😮', label: 'Wow', color: 'text-amber-400' },
  sad: { emoji: '😢', label: 'Sad', color: 'text-amber-400' },
  angry: { emoji: '😡', label: 'Angry', color: 'text-orange-500' },
};

export interface NoteComment {
  id: string;
  noteId: string;
  text: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  createdAt: number;
  replyToCommentId?: string | null;
  replyToUsername?: string | null;
}

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  categoryTag: string;
  imageUrl?: string;
  imageUrls?: string[];
  imageOriginalSize?: number;
  imageCompressedSize?: number;
  videoUrl?: string;
  likesCount: number;
  likedBy: string[];
  reactions?: Record<string, ReactionType>;
  commentsCount?: number;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  createdAt: number;
  replyToMessageId?: string | null;
  replyToUsername?: string | null;
  replyToText?: string | null;
}

export interface ProfileViewRecord {
  viewerUsername: string;
  viewerDisplayName: string;
  viewerAvatar: string;
  timestamp: number;
}

export interface NotificationItem {
  id: string;
  recipientUsername: string;
  actorUsername: string;
  actorDisplayName: string;
  actorAvatar: string;
  type: 'reaction' | 'comment';
  reactionType?: ReactionType;
  noteId: string;
  noteTitle: string;
  commentText?: string;
  createdAt: number;
  read: boolean;
}

export type ActiveTab = 'playground' | 'leaderboard' | 'chat' | 'notifications' | 'profile';
