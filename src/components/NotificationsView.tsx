import React from 'react';
import { Bell, CheckCheck, MessageSquare, Heart, Sparkles, ArrowRight, Trash2 } from 'lucide-react';
import { NotificationItem, StudentUser, REACTION_EMOJIS } from '../types';
import { markAllNotificationsAsRead, markNotificationAsRead, deleteNotification } from '../services/firebase';

interface NotificationsViewProps {
  currentUser: StudentUser | null;
  notifications: NotificationItem[];
  onRequireAuth: () => void;
  onSelectNote: (noteId: string) => void;
  studentAvatars?: Record<string, string>;
  onOpenProfile?: (username: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  currentUser,
  notifications,
  onRequireAuth,
  onSelectNote,
  studentAvatars,
  onOpenProfile,
}) => {
  if (!currentUser) {
    return (
      <div className="glass-card max-w-md mx-auto p-8 rounded-3xl text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-white/5 mx-auto flex items-center justify-center text-[var(--accent)] shadow-inner">
          <Bell size={24} />
        </div>
        <h3 className="text-base font-bold text-[var(--text)]">Sign In for Notifications</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Sign in to receive instant alerts when peers react to or comment on your posts!
        </p>
        <button
          onClick={onRequireAuth}
          className="btn-primary py-2.5 px-6 text-xs font-semibold"
        >
          Sign In / Join Gen-Z
        </button>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
    onSelectNote(notif.noteId);
  };

  const handleMarkAllRead = async () => {
    if (currentUser) {
      await markAllNotificationsAsRead(currentUser.username);
    }
  };

  const handleDeleteNotif = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    await deleteNotification(notifId);
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 glass-container p-4 sm:p-5 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shrink-0">
            <Bell size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-dark)] font-bold text-[10px]">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inset-control px-3 py-1.5 rounded-full text-xs font-medium text-[var(--accent)] hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="glass-card p-10 sm:p-14 text-center rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-full bg-white/5 mx-auto flex items-center justify-center text-[var(--text-secondary)] opacity-60">
            <Sparkles size={24} />
          </div>
          <h3 className="text-sm font-bold text-[var(--text)]">No Notifications Yet</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
            When other students react to your posts or comment, you will see updates here!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => {
            const avatar =
              (studentAvatars && studentAvatars[notif.actorUsername.toLowerCase()]) ||
              notif.actorAvatar;
            const rMeta = notif.reactionType ? REACTION_EMOJIS[notif.reactionType] : null;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`glass-card p-4 rounded-2xl flex items-start justify-between gap-3 transition-all cursor-pointer border hover:border-[var(--accent)]/50 ${
                  !notif.read
                    ? 'bg-white/[0.12] border-l-4 border-l-[var(--accent)]'
                    : 'bg-white/5 border-white/10 opacity-90'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Actor Avatar with Action Icon Badge */}
                  <div className="relative shrink-0">
                    <img
                      src={avatar}
                      alt={notif.actorDisplayName}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile?.(notif.actorUsername);
                      }}
                      className="w-10 h-10 rounded-full object-cover aspect-square border border-white/20 bg-black/40 cursor-pointer hover:opacity-85"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-white/30 flex items-center justify-center text-[10px] leading-none">
                      {notif.type === 'reaction' ? (
                        rMeta ? rMeta.emoji : <Heart size={10} className="text-rose-400 fill-rose-400" />
                      ) : (
                        <MessageSquare size={10} className="text-blue-400" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="text-xs text-[var(--text)] leading-relaxed">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProfile?.(notif.actorUsername);
                        }}
                        className="font-bold hover:underline"
                      >
                        {notif.actorDisplayName} (@{notif.actorUsername})
                      </button>{' '}
                      {notif.type === 'reaction' ? (
                        <span>
                          reacted {rMeta?.emoji || '❤️'} {rMeta?.label || ''} to your post{' '}
                          <span className="font-semibold text-[var(--text)]">"{notif.noteTitle}"</span>
                        </span>
                      ) : (
                        <span>
                          commented on your post{' '}
                          <span className="font-semibold text-[var(--text)]">"{notif.noteTitle}"</span>
                        </span>
                      )}
                    </div>

                    {/* Quoted comment text preview */}
                    {notif.commentText && (
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-[var(--text-secondary)] italic truncate">
                        "{notif.commentText}"
                      </div>
                    )}

                    <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-center">
                  {!notif.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-sm" />
                  )}
                  <button
                    onClick={(e) => handleDeleteNotif(e, notif.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ArrowRight size={14} className="text-[var(--text-secondary)]" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
