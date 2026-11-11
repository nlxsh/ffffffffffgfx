import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Reply, X, ArrowLeft } from 'lucide-react';
import { ChatMessage, StudentUser } from '../types';
import { sendGlobalChatMessage, subscribeToGlobalChat } from '../services/firebase';

interface GlobalChatViewProps {
  currentUser: StudentUser | null;
  onRequireAuth: () => void;
  studentAvatars?: Record<string, string>;
  studentNames?: Record<string, string>;
  onOpenProfile?: (username: string) => void;
  onGoBack?: () => void;
}


export const GlobalChatView: React.FC<GlobalChatViewProps> = ({
  currentUser,
  onRequireAuth,
  studentAvatars,
  studentNames,
  onOpenProfile,
  onGoBack,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{
    id: string;
    username: string;
    text: string;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsubscribe = subscribeToGlobalChat((msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length]);

  const handleStartReply = (msg: ChatMessage) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setReplyTarget({
      id: msg.id,
      username: msg.authorUsername,
      text: msg.text.length > 55 ? msg.text.slice(0, 52) + '...' : msg.text,
    });
    inputRef.current?.focus();
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    const clean = inputText.trim();
    if (!clean || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      await sendGlobalChatMessage({
        text: clean,
        authorUsername: currentUser.username,
        authorDisplayName: currentUser.displayName,
        authorAvatar: (studentAvatars && studentAvatars[currentUser.username.toLowerCase()]) || currentUser.avatarUrl,
        replyToMessageId: replyTarget?.id || null,
        replyToUsername: replyTarget?.username || null,
        replyToText: replyTarget?.text || null,
      });

      setReplyTarget(null);
      scrollToBottom('smooth');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] text-[var(--text)] flex flex-col selection:bg-[var(--accent)] selection:text-[var(--accent-dark)] animate-in fade-in duration-200">
      {/* Full-Screen Top Header Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[var(--bg)]/90 border-b border-[var(--glass-border)] h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full inset-control flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text)] transition-transform active:scale-95 cursor-pointer shrink-0"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft size={18} className="text-[var(--accent)]" />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shrink-0">
              <MessageSquare size={16} />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[var(--text)] leading-tight truncate">
              Live Chat
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-[var(--text-secondary)] font-mono px-3 py-1 rounded-full inset-control border border-[var(--glass-border)]">
            {messages.length} messages
          </span>
        </div>
      </header>

      {/* Message List Stream (Full Height Flex) */}
      <div
        ref={scrollRef}
        className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 overflow-y-auto space-y-3.5"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-secondary)]">
            <MessageSquare size={36} className="opacity-40 mb-3 text-[var(--accent)]" />
            <p className="text-sm font-semibold text-[var(--text)]">No messages yet</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Say hello to start the real-time discussion with fellow students!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUser?.username === msg.authorUsername;
            const authorDisplayName =
              (studentNames && studentNames[msg.authorUsername.toLowerCase()]) ||
              (currentUser && currentUser.username.toLowerCase() === msg.authorUsername.toLowerCase()
                ? currentUser.displayName
                : msg.authorDisplayName);

            return (
              <div
                key={msg.id}
                className={`group flex items-start gap-2.5 max-w-[88%] sm:max-w-[75%] ${
                  isMe ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <img
                  src={(studentAvatars && studentAvatars[msg.authorUsername.toLowerCase()]) || msg.authorAvatar}
                  alt={authorDisplayName}
                  onClick={() => onOpenProfile?.(msg.authorUsername)}
                  className="w-8 h-8 rounded-full object-cover aspect-square border border-white/15 bg-black/40 shrink-0 mt-0.5 cursor-pointer hover:opacity-85 transition-opacity"
                />

                <div className={`space-y-1 min-w-0 ${isMe ? 'items-end text-right' : ''}`}>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] px-1">
                    <button
                      onClick={() => onOpenProfile?.(msg.authorUsername)}
                      className="font-medium text-[var(--text)] hover:underline cursor-pointer"
                    >
                      {authorDisplayName}
                    </button>
                    <button
                      onClick={() => onOpenProfile?.(msg.authorUsername)}
                      className="hover:underline cursor-pointer"
                    >
                      @{msg.authorUsername}
                    </button>
                    <span aria-hidden="true">·</span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {/* Reply Action Button */}
                    <button
                      onClick={() => handleStartReply(msg)}
                      className="opacity-75 hover:opacity-100 text-[var(--accent)] hover:underline flex items-center gap-0.5 ml-1 transition-opacity cursor-pointer"
                      title="Reply to message"
                    >
                      <Reply size={10} />
                      <span>Reply</span>
                    </button>
                  </div>

                  <div
                    className={`rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-[var(--chat-me-bg)] text-[var(--chat-me-text)] font-medium rounded-tr-sm shadow-md'
                        : 'bg-[var(--chat-other-bg)] text-[var(--chat-other-text)] border border-[var(--chat-other-border)] rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {/* Quoted Message Preview if replying to someone */}
                    {msg.replyToUsername && (
                      <div
                        className={`p-1.5 px-2.5 rounded-xl mb-1.5 text-[11px] border-l-2 text-left truncate ${
                          isMe
                            ? 'bg-[var(--chat-quote-me-bg)] border-[var(--chat-quote-me-border)] text-[var(--chat-quote-me-text)]'
                            : 'bg-[var(--chat-quote-other-bg)] border-[var(--chat-quote-other-border)] text-[var(--chat-quote-other-text)]'
                        }`}
                      >
                        <span className="font-semibold mr-1">@{msg.replyToUsername}:</span>
                        <span>{msg.replyToText}</span>
                      </div>
                    )}

                    <span>{msg.text}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Fixed Composer Area */}
      <div className="w-full bg-[var(--bg)]/95 backdrop-blur-xl border-t border-[var(--glass-border)] p-3 sm:p-4 shrink-0 shadow-2xl">
        <div className="max-w-4xl mx-auto space-y-2">

          {/* Reply Banner when active */}
          {replyTarget && (
            <div className="px-3 py-1.5 rounded-2xl bg-[var(--surface-hover)] border border-[var(--glass-border)] flex items-center justify-between text-xs text-[var(--text)] animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-1.5 truncate">
                <Reply size={12} className="text-[var(--accent)] shrink-0" />
                <span className="font-medium text-[var(--accent)]">@{replyTarget.username}:</span>
                <span className="text-[var(--text-secondary)] truncate">{replyTarget.text}</span>
              </div>
              <button
                onClick={() => setReplyTarget(null)}
                className="w-5 h-5 rounded-full inset-control flex items-center justify-center hover:bg-white/20 shrink-0 ml-2"
                title="Cancel reply"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* High-Contrast Composer Capsule */}
          <form
            onSubmit={handleSend}
            className="glass-container p-1.5 pl-4 rounded-full flex items-center gap-2 border border-[var(--glass-border)] focus-within:border-[var(--accent)] shadow-xl"
            style={{ borderRadius: '9999rem' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                replyTarget
                  ? `Reply to @${replyTarget.username}...`
                  : currentUser
                  ? 'Message students...'
                  : 'Sign in to send messages'
              }
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-[var(--text)] py-2 outline-none focus:outline-none placeholder:text-[var(--text-secondary)] min-w-0"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="w-10 h-10 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-pressed)] flex items-center justify-center shrink-0 shadow-md active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
              aria-label="Send message"
            >
              <Send size={18} strokeWidth={2.5} className="text-[var(--accent-dark)] translate-x-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
