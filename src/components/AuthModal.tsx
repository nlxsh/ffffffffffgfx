import React, { useState, useRef } from 'react';
import { Upload, Check, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { StudentUser } from '../types';
import { registerStudent, loginStudent, isUsernameTaken } from '../services/firebase';
import { compressImage } from '../utils/imageCompressor';
import { defaultAvatarUrls } from '../data/seedData';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: StudentUser) => void;
  onClose?: () => void;
  canClose?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  canClose = false,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>(defaultAvatarUrls[0]);

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle unique username check on blur or change
  const handleUsernameBlur = async () => {
    const clean = username.trim().toLowerCase();
    if (!clean || clean.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    if (mode === 'login') return;

    setIsCheckingUsername(true);
    try {
      const taken = await isUsernameTaken(clean);
      setUsernameStatus(taken ? 'taken' : 'available');
    } catch {
      setUsernameStatus('idle');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Gallery image selection with silent background compression (zero telemetry exposed)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingAvatar(true);
    setErrorMessage(null);

    try {
      const result = await compressImage(file, {
        maxDimension: 320,
        quality: 0.75,
        maxSizeBytes: 40_000,
        mimeType: 'image/webp',
      });

      setAvatarUrl(result.dataUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process image';
      setErrorMessage(msg);
    } finally {
      setIsCompressingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const cleanUsername = username.trim().toLowerCase();

      if (!cleanUsername || cleanUsername.length < 3) {
        throw new Error('Username must be at least 3 characters long.');
      }

      if (mode === 'register') {
        if (!password || password.length < 4) {
          throw new Error('Please set a password with at least 4 characters.');
        }

        const user = await registerStudent({
          username: cleanUsername,
          displayName: displayName.trim() || cleanUsername,
          password,
          avatarUrl,
        });

        onSuccess(user);
      } else {
        const user = await loginStudent(cleanUsername, password);
        onSuccess(user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during authentication';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className="glass-container w-full max-w-md p-6 sm:p-8 rounded-3xl relative my-auto max-h-[88vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ borderRadius: '2rem' }}
      >
        {/* Header / Mode Switcher */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <img 
                src="/assets/aistudio/1000168760-removebg-preview_03adaab4.png" 
                alt="Gen-Z Portal" 
                style={{ height: '22px', maxHeight: '22px', width: 'auto', maxWidth: '100px' }}
                className="object-contain brightness-0 dark:invert"
              />
              <span className="text-xs text-[var(--text-secondary)]">· Student Portal</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {mode === 'register'
                ? 'Create your unique student account to start'
                : 'Sign in to access study notes and community'}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-black/30 rounded-full">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                mode === 'register'
                  ? 'bg-[var(--accent)] text-[var(--accent-dark)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                mode === 'login'
                  ? 'bg-[var(--accent)] text-[var(--accent-dark)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            /* Avatar Upload Section (Silent background compression, clean UI) */
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-black/20 border border-white/5">
              <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border border-white/20 bg-black/40">
                <img
                  src={avatarUrl}
                  alt="Student Avatar"
                  className="w-full h-full object-cover aspect-square"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--text)]">Profile Avatar</div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Pick any photo from your phone or device gallery
                </p>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressingAvatar}
                    className="inset-control px-3.5 py-1 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-white/10"
                  >
                    <Upload size={13} />
                    <span>{isCompressingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Username Input with Flex Layout (Zero overlap guaranteed) */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-2">
              <label className="text-xs font-medium text-[var(--text)]">
                Username <span className="text-[var(--text-secondary)] font-normal">(unique ID)</span>
              </label>
              {mode === 'register' && (
                <span className="text-xs">
                  {isCheckingUsername ? (
                    <span className="text-[var(--text-secondary)] text-[11px]">Checking...</span>
                  ) : usernameStatus === 'available' ? (
                    <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                      <Check size={12} /> Available
                    </span>
                  ) : usernameStatus === 'taken' ? (
                    <span className="text-rose-400 text-[11px]">Taken! Choose another</span>
                  ) : null}
                </span>
              )}
            </div>

            {/* Flex Container: @ symbol is inline, never overlaps text */}
            <div className="pill-input flex items-center gap-1 px-4 py-2.5 focus-within:border-[var(--accent)]">
              <span className="text-[var(--text-secondary)] select-none text-sm font-medium shrink-0">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  setUsernameStatus('idle');
                }}
                onBlur={handleUsernameBlur}
                placeholder="Choose unique username"
                required
                className="bg-transparent border-none outline-none text-[var(--text)] text-sm flex-1 w-full p-0 leading-normal"
              />
            </div>
          </div>

          {/* Display Name (Register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[var(--text)] mb-1.5 px-2">
                Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                required
                className="pill-input"
              />
            </div>
          )}

          {/* Password Input */}
          <div>
            <label className="block text-xs font-medium text-[var(--text)] mb-1.5 px-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="pill-input"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || (mode === 'register' && usernameStatus === 'taken')}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : mode === 'register' ? (
                <>
                  <UserPlus size={16} />
                  <span>Join Gen-Z Portal</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>
        </form>

        {canClose && onClose && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)] underline"
            >
              Continue as Guest Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
