import React from 'react';
import { Trophy, Heart, FileText, Sparkles, Share2 } from 'lucide-react';
import { StudentUser, StudyNote } from '../types';
import { computeLeaderboardFromNotes } from '../services/firebase';
import { formatCompactNumber } from '../utils/numberFormatter';

interface LeaderboardViewProps {
  notes: StudyNote[];
  currentUser: StudentUser | null;
  onRequireAuth: () => void;
  onNavigateToPlayground: () => void;
  studentAvatars?: Record<string, string>;
  studentNames?: Record<string, string>;
  onOpenProfile?: (username: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  notes,
  currentUser,
  onRequireAuth,
  onNavigateToPlayground,
  studentAvatars,
  studentNames,
  onOpenProfile,
}) => {
  const top10 = computeLeaderboardFromNotes(notes, studentAvatars, studentNames);

  // Find current user's rank
  const myStanding = currentUser
    ? top10.find((item) => item.username.toLowerCase() === currentUser.username.toLowerCase())
    : null;

  const top1 = top10[0];
  const top2 = top10[1];
  const top3 = top10[2];
  const restRanks = top10.slice(3, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy size={22} className="text-[var(--accent)]" />
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            Rank
          </h2>
        </div>

        {/* Current user badge */}
        {currentUser ? (
          <div
            onClick={() => onOpenProfile?.(currentUser.username)}
            className="glass-container px-4 py-2 rounded-2xl flex items-center gap-3 self-start sm:self-auto cursor-pointer hover:bg-white/10 transition-colors"
          >
            <img
              src={(studentAvatars && currentUser && studentAvatars[currentUser.username.toLowerCase()]) || currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="w-8 h-8 rounded-full object-cover aspect-square border border-white/20 bg-black/40"
            />
            <div>
              <div className="text-xs font-semibold text-[var(--text)]">
                {myStanding ? `Rank #${myStanding.rank} in Top 10` : 'Not ranked in Top 10 yet'}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                {myStanding ? `${myStanding.likes} upvotes earned` : 'Create posts to gain upvotes'}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={onRequireAuth}
            className="btn-primary py-2 px-4 text-xs font-medium self-start sm:self-auto"
          >
            Join & Compete
          </button>
        )}
      </div>

      {/* When no students or notes exist yet (Clean Empty State) */}
      {top10.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center text-[var(--accent)] shadow-inner">
            <Trophy size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text)]">
              The Podium is Ready for You
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto leading-relaxed">
              No posts have been published yet. Share your thoughts or media in the feed to claim the #1 spot on the leaderboard!
            </p>
          </div>

          <button
            onClick={onNavigateToPlayground}
            className="btn-primary py-2.5 px-6 text-xs font-semibold inline-flex items-center gap-2"
          >
            <Share2 size={15} />
            <span>Create First Post</span>
          </button>
        </div>
      ) : (
        <>
          {/* Top 3 Podium (Rank 1, 2, 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
            {/* Rank 2 (Silver) */}
            {top2 ? (
              <div
                onClick={() => onOpenProfile?.(top2.username)}
                className="glass-card p-5 rounded-3xl flex flex-col items-center text-center order-2 md:order-1 relative cursor-pointer hover:border-white/30 transition-all hover:scale-[1.02]"
              >
                <div className="absolute top-3 left-4 text-xs font-bold font-mono text-[var(--text-secondary)]">
                  #02
                </div>
                <div className="relative mb-3">
                  <img
                    src={top2.avatarUrl}
                    alt={top2.displayName}
                    className="w-16 h-16 rounded-full object-cover aspect-square border-2 border-white/30 bg-black/40"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center font-bold text-xs shadow-md">
                    2
                  </div>
                </div>
                <h4 className="text-sm font-bold text-[var(--text)] hover:underline">{top2.displayName}</h4>
                <span className="text-[11px] text-[var(--text-secondary)]">@{top2.username}</span>

                <div className="mt-4 pt-3 border-t border-white/5 w-full flex items-center justify-around text-xs">
                  <div className="flex items-center gap-1 text-[var(--text)]">
                    <Heart size={13} className="text-rose-400 fill-rose-400" />
                    <span className="font-semibold" title={top2.likes.toLocaleString()}>{formatCompactNumber(top2.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <FileText size={13} />
                    <span>{formatCompactNumber(top2.notes)} posts</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-5 rounded-3xl flex flex-col items-center justify-center text-center order-2 md:order-1 border-dashed border-white/10 min-h-[200px] text-xs text-[var(--text-secondary)]">
                <span className="font-mono text-sm mb-1 text-[var(--accent)]">#02 Open</span>
                <span>Waiting for posts</span>
              </div>
            )}

            {/* Rank 1 (Gold - Elevated Champion) */}
            {top1 && (
              <div
                onClick={() => onOpenProfile?.(top1.username)}
                className="glass-card p-6 rounded-3xl flex flex-col items-center text-center order-1 md:order-2 border border-white/30 relative shadow-2xl scale-100 md:scale-105 bg-white/[0.14] cursor-pointer hover:border-[var(--accent)] transition-all"
              >
                <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-dark)] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>Current #1 Leader</span>
                </div>

                <div className="relative mb-3 mt-1">
                  <img
                    src={top1.avatarUrl}
                    alt={top1.displayName}
                    className="w-20 h-20 rounded-full object-cover aspect-square border-2 border-[var(--accent)] bg-black/40 shadow-lg"
                  />
                  <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--accent-dark)] flex items-center justify-center font-black text-xs shadow-md">
                    1
                  </div>
                </div>
                <h4 className="text-base font-bold text-[var(--text)] hover:underline">{top1.displayName}</h4>
                <span className="text-xs text-[var(--text-secondary)]">@{top1.username}</span>

                <div className="mt-5 pt-3 border-t border-white/10 w-full flex items-center justify-around text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--text)]">
                    <Heart size={14} className="text-rose-400 fill-rose-400" />
                    <span className="font-bold text-sm" title={top1.likes.toLocaleString()}>{formatCompactNumber(top1.likes)}</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">likes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <FileText size={14} />
                    <span className="font-semibold">{formatCompactNumber(top1.notes)}</span>
                    <span className="text-[10px]">posts</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {top3 ? (
              <div
                onClick={() => onOpenProfile?.(top3.username)}
                className="glass-card p-5 rounded-3xl flex flex-col items-center text-center order-3 relative cursor-pointer hover:border-white/30 transition-all hover:scale-[1.02]"
              >
                <div className="absolute top-3 left-4 text-xs font-bold font-mono text-[var(--text-secondary)]">
                  #03
                </div>
                <div className="relative mb-3">
                  <img
                    src={top3.avatarUrl}
                    alt={top3.displayName}
                    className="w-16 h-16 rounded-full object-cover aspect-square border-2 border-white/20 bg-black/40"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700/80 text-amber-100 flex items-center justify-center font-bold text-xs shadow-md">
                    3
                  </div>
                </div>
                <h4 className="text-sm font-bold text-[var(--text)] hover:underline">{top3.displayName}</h4>
                <span className="text-[11px] text-[var(--text-secondary)]">@{top3.username}</span>

                <div className="mt-4 pt-3 border-t border-white/5 w-full flex items-center justify-around text-xs">
                  <div className="flex items-center gap-1 text-[var(--text)]">
                    <Heart size={13} className="text-rose-400 fill-rose-400" />
                    <span className="font-semibold" title={top3.likes.toLocaleString()}>{formatCompactNumber(top3.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <FileText size={13} />
                    <span>{formatCompactNumber(top3.notes)} posts</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-5 rounded-3xl flex flex-col items-center justify-center text-center order-3 border-dashed border-white/10 min-h-[200px] text-xs text-[var(--text-secondary)]">
                <span className="font-mono text-sm mb-1 text-[var(--accent)]">#03 Open</span>
                <span>Waiting for posts</span>
              </div>
            )}
          </div>

          {/* Ranks 4 to 10 Table */}
          {restRanks.length > 0 && (
            <div className="glass-container rounded-3xl p-4 sm:p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)] mb-2">
                <span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
                  Rank 04 to 10 Leaders
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">Total ranks capped at 10</span>
              </div>

              <div className="divide-y divide-[var(--glass-border)]">
                {restRanks.map((item) => {
                  const isMe = currentUser?.username === item.username;

                  return (
                    <div
                      key={item.username}
                      onClick={() => onOpenProfile?.(item.username)}
                      className={`py-3 px-2 sm:px-3 flex items-center justify-between transition-colors rounded-xl cursor-pointer ${
                        isMe ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <span className="font-mono text-xs font-bold text-[var(--text-secondary)] w-6 text-center shrink-0">
                          #{item.rank < 10 ? `0${item.rank}` : item.rank}
                        </span>

                        <img
                          src={item.avatarUrl}
                          alt={item.displayName}
                          className="w-9 h-9 rounded-full object-cover aspect-square border border-white/15 bg-black/40 shrink-0"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--text)] truncate hover:underline">
                              {item.displayName}
                            </span>
                            {isMe && (
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-[var(--accent)] text-[var(--accent-dark)] font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate">
                            @{item.username}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-xs">
                        <div className="flex items-center gap-1.5 text-[var(--text)]">
                          <Heart size={14} className="text-rose-400 fill-rose-400" />
                          <span className="font-semibold font-mono" title={item.likes.toLocaleString()}>{formatCompactNumber(item.likes)}</span>
                        </div>

                        <div className="hidden sm:flex items-center gap-1 text-[var(--text-secondary)] text-[11px]">
                          <FileText size={13} />
                          <span>{item.notes} posts</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
