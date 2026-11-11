import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  setDoc,
  getDoc,
  increment,
  deleteField,
  where,
  Firestore,
} from 'firebase/firestore';
import { StudentUser, StudyNote, ChatMessage, NoteComment, ProfileViewRecord, ReactionType, NotificationItem } from '../types';

// User-provided Firebase credentials for project gen-z-d600b
const firebaseConfig = {
  apiKey: "AIzaSyD9wmRk7sLg315oq3ATvDjAvOFtowDVYyU",
  authDomain: "gen-z-d600b.firebaseapp.com",
  projectId: "gen-z-d600b",
  storageBucket: "gen-z-d600b.firebasestorage.app",
  messagingSenderId: "540352979305",
  appId: "1:540352979305:web:c0f98629a8a980cf725df8",
  measurementId: "G-PMXZ6E1EE7"
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestoreDb: Firestore = getFirestore(app);

// Active browser session key
const SESSION_USER_KEY = 'genz_active_session_user';

/**
 * Helper to strip `undefined` values from Firestore document payloads.
 * Firestore setDoc/addDoc/updateDoc throw an error if any field value is undefined.
 */
function sanitizeFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ==========================================
// NOTIFICATIONS & REALTTIME ALERTS
// ==========================================

export async function sendNotification(params: {
  recipientUsername: string;
  actorUsername: string;
  actorDisplayName: string;
  actorAvatar: string;
  type: 'reaction' | 'comment';
  reactionType?: ReactionType;
  noteId: string;
  noteTitle: string;
  commentText?: string;
}): Promise<void> {
  const recipient = params.recipientUsername.trim().toLowerCase();
  const actor = params.actorUsername.trim().toLowerCase();

  // Don't send notifications to self
  if (recipient === actor) return;

  try {
    const notifItem: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientUsername: recipient,
      actorUsername: params.actorUsername,
      actorDisplayName: params.actorDisplayName,
      actorAvatar: params.actorAvatar,
      type: params.type,
      reactionType: params.reactionType,
      noteId: params.noteId,
      noteTitle: params.noteTitle,
      commentText: params.commentText,
      createdAt: Date.now(),
      read: false,
    };

    await setDoc(doc(firestoreDb, 'notifications', notifItem.id), sanitizeFirestoreData(notifItem));
  } catch (err) {
    console.warn('Send notification notice:', err);
  }
}

export function subscribeToNotifications(
  usernameRaw: string,
  callback: (notifs: NotificationItem[]) => void
): () => void {
  const username = usernameRaw.trim().toLowerCase();
  try {
    const q = query(
      collection(firestoreDb, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: NotificationItem[] = [];
        snapshot.forEach((d) => {
          const item = { id: d.id, ...d.data() } as NotificationItem;
          if (item.recipientUsername?.toLowerCase() === username) {
            notifs.push(item);
          }
        });
        callback(notifs);
      },
      (error) => {
        console.warn('Notifications listener notice:', error.message);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Error attaching notifications subscriber:', err);
    callback([]);
    return () => {};
  }
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  try {
    await updateDoc(doc(firestoreDb, 'notifications', notifId), {
      read: true,
    });
  } catch (err) {
    console.warn('Mark notification as read notice:', err);
  }
}

export async function markAllNotificationsAsRead(usernameRaw: string): Promise<void> {
  const username = usernameRaw.trim().toLowerCase();
  try {
    const q = query(collection(firestoreDb, 'notifications'), limit(100));
    const snap = await getDocs(q);
    const updatePromises: Promise<void>[] = [];

    snap.forEach((d) => {
      const data = d.data() as NotificationItem;
      if (data.recipientUsername?.toLowerCase() === username && !data.read) {
        updatePromises.push(updateDoc(doc(firestoreDb, 'notifications', d.id), { read: true }));
      }
    });

    await Promise.all(updatePromises);
  } catch (err) {
    console.warn('Mark all notifications as read notice:', err);
  }
}

export async function deleteNotification(notifId: string): Promise<void> {
  try {
    await deleteDoc(doc(firestoreDb, 'notifications', notifId));
  } catch (err) {
    console.warn('Delete notification notice:', err);
  }
}

export async function deleteAllNotifications(usernameRaw: string): Promise<void> {
  const username = usernameRaw.trim().toLowerCase();
  try {
    const q = query(collection(firestoreDb, 'notifications'), limit(100));
    const snap = await getDocs(q);
    const deletePromises: Promise<void>[] = [];

    snap.forEach((d) => {
      const data = d.data() as NotificationItem;
      if (data.recipientUsername?.toLowerCase() === username) {
        deletePromises.push(deleteDoc(doc(firestoreDb, 'notifications', d.id)));
      }
    });

    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Delete all notifications notice:', err);
  }
}

// ==========================================
// AUTHENTICATION & USER MANAGEMENT
// ==========================================

export function getCurrentUser(): StudentUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY) || localStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: StudentUser | null) {
  try {
    if (user) {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_USER_KEY);
      localStorage.removeItem(SESSION_USER_KEY);
    }
  } catch (e) {
    console.error('Error saving active session:', e);
  }
}

/**
 * Checks in real-time whether a username is already taken.
 */
export async function isUsernameTaken(rawUsername: string): Promise<boolean> {
  const username = rawUsername.trim().toLowerCase();
  if (!username) return true;

  try {
    const docRef = doc(firestoreDb, 'students', username);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (err) {
    console.warn('Username check connection notice:', err);
    return false;
  }
}

/**
 * Register a new student directly with unique username validation.
 */
/**
 * Fast client-side SHA-256 password hash using Web Crypto API.
 * Never stores plain-text passwords in Firestore.
 */
async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(plain));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Register a new student directly with unique username validation.
 * Passwords are encrypted with SHA-256 and stored in a private credentials document,
 * never exposed in the public student document.
 */
export async function registerStudent(params: {
  username: string;
  displayName: string;
  password?: string;
  avatarUrl: string;
  bio?: string;
}): Promise<StudentUser> {
  const username = params.username.trim().toLowerCase();

  const docRef = doc(firestoreDb, 'students', username);
  const existingSnap = await getDoc(docRef);
  if (existingSnap.exists()) {
    throw new Error(`Username "@${username}" is already taken. Please choose another.`);
  }

  // Public student profile document without ANY password field
  const newUser: StudentUser = {
    id: `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username,
    displayName: params.displayName.trim() || username,
    avatarUrl: params.avatarUrl,
    bio: params.bio || 'Gen-Z student exploring new study hacks and mastering concepts.',
    totalLikesReceived: 0,
    totalNotesShared: 0,
    createdAt: Date.now(),
  };

  await setDoc(docRef, sanitizeFirestoreData(newUser));

  // Store password hash in private subcollection credentials
  if (params.password) {
    const pwdHash = await hashPassword(params.password);
    const authRef = doc(firestoreDb, 'students', username, 'private_auth', 'credentials');
    await setDoc(authRef, {
      hash: pwdHash,
      updatedAt: Date.now(),
    });
  }

  setCurrentUser(newUser);
  return newUser;
}

/**
 * Login existing student by username and password.
 * Checks against the secure private password hash.
 * If legacy password exists on public student doc, strips it immediately to sanitize existing data.
 */
export async function loginStudent(usernameRaw: string, password?: string): Promise<StudentUser> {
  const username = usernameRaw.trim().toLowerCase();
  const docRef = doc(firestoreDb, 'students', username);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`No student found with username "@${username}". Please sign up first.`);
  }

  const user = snap.data() as StudentUser & { password?: string };

  if (password) {
    const inputHash = await hashPassword(password);
    const authRef = doc(firestoreDb, 'students', username, 'private_auth', 'credentials');
    const authSnap = await getDoc(authRef);

    if (authSnap.exists()) {
      const stored = authSnap.data() as { hash: string };
      if (stored.hash !== inputHash) {
        throw new Error('Incorrect password. Please try again.');
      }
    } else if (user.password) {
      // Legacy user verification (plain or legacy hash)
      if (user.password !== password && user.password !== inputHash) {
        throw new Error('Incorrect password. Please try again.');
      }
      // Migrate password to secure private subcollection
      await setDoc(authRef, {
        hash: inputHash,
        updatedAt: Date.now(),
      });
      // Strip legacy password from public student document
      try {
        await updateDoc(docRef, { password: deleteField() });
      } catch {
        // Fallback: overwrite doc without password
        const cleanUser = { ...user };
        delete cleanUser.password;
        await setDoc(docRef, sanitizeFirestoreData(cleanUser));
      }
    }
  }

  // Ensure password is never stored in memory or local session
  const cleanSessionUser: StudentUser = { ...user };
  delete cleanSessionUser.password;

  setCurrentUser(cleanSessionUser);
  return cleanSessionUser;
}

export function logoutStudent() {
  setCurrentUser(null);
}

/**
 * Real-time listener for all student profiles to dynamically sync avatars and display names across
 * notes, comments, replies, chat, and leaderboard when an avatar or name (with emojis) is changed.
 */
export function subscribeToStudentAvatars(
  callback: (avatarMap: Record<string, string>, nameMap?: Record<string, string>) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(firestoreDb, 'students'),
      (snapshot) => {
        const avatars: Record<string, string> = {};
        const names: Record<string, string> = {};
        snapshot.forEach((d) => {
          const data = d.data();
          const username = (data.username || d.id).toLowerCase();
          if (data && data.avatarUrl) {
            avatars[username] = data.avatarUrl;
          }
          if (data && data.displayName) {
            names[username] = data.displayName;
          }
        });
        callback(avatars, names);
      },
      (error) => {
        console.warn('Realtime avatars listener notice:', error.message);
        callback({}, {});
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Error attaching avatars subscriber:', err);
    callback({}, {});
    return () => {};
  }
}

/**
 * Update a student's profile (DisplayName and Bio).
 * Enforces 30-day constraint for display name updates and propagates new name to all active notes.
 */
export async function updateStudentProfile(
  usernameRaw: string,
  updates: { displayName?: string; bio?: string }
): Promise<StudentUser> {
  const username = usernameRaw.trim().toLowerCase();
  const userRef = doc(firestoreDb, 'students', username);
  const snap = await getDoc(userRef);
  
  if (!snap.exists()) {
    throw new Error('User not found');
  }
  
  const userData = snap.data() as StudentUser;
  const finalUpdates: Record<string, any> = {};
  
  if (updates.bio !== undefined) {
    finalUpdates.bio = updates.bio.trim();
  }
  
  if (updates.displayName !== undefined && updates.displayName.trim() !== userData.displayName) {
    // Check 30-day constraint (30 days * 24 hours * 60 mins * 60 secs * 1000 ms)
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    if (userData.lastDisplayNameUpdate && (now - userData.lastDisplayNameUpdate < THIRTY_DAYS_MS)) {
      const daysRemaining = Math.ceil((THIRTY_DAYS_MS - (now - userData.lastDisplayNameUpdate)) / (24 * 60 * 60 * 1000));
      throw new Error(`You can change your name again in ${daysRemaining} days.`);
    }
    
    finalUpdates.displayName = updates.displayName.trim();
    finalUpdates.lastDisplayNameUpdate = now;
  }
  
  if (Object.keys(finalUpdates).length > 0) {
    await updateDoc(userRef, finalUpdates);

    // Propagate updated name across all notes authored by this user
    if (finalUpdates.displayName) {
      try {
        const notesQuery = query(
          collection(firestoreDb, 'study_notes'),
          where('authorUsername', '==', username)
        );
        const notesSnap = await getDocs(notesQuery);
        const notePromises = notesSnap.docs.map((d) =>
          updateDoc(d.ref, { authorDisplayName: finalUpdates.displayName })
        );
        await Promise.all(notePromises);
      } catch (noteErr) {
        console.warn('Note author display name sync notice:', noteErr);
      }
    }
    
    const curr = getCurrentUser();
    if (curr && curr.username.toLowerCase() === username) {
      const updated = { ...curr, ...finalUpdates };
      setCurrentUser(updated);
      return updated;
    }
  }
  
  return { ...userData, ...finalUpdates };
}

/**
 * Update a student's avatar in Firestore and local session.
 */
export async function updateStudentAvatar(usernameRaw: string, newAvatarUrl: string): Promise<void> {
  const username = usernameRaw.trim().toLowerCase();
  await updateDoc(doc(firestoreDb, 'students', username), {
    avatarUrl: newAvatarUrl,
  });
  const curr = getCurrentUser();
  if (curr && curr.username.toLowerCase() === username) {
    const updated = { ...curr, avatarUrl: newAvatarUrl };
    setCurrentUser(updated);
  }
}

/**
 * Update a student's cover photo in Firestore and local session.
 */
export async function updateStudentCoverPhoto(
  usernameRaw: string,
  newCoverUrl: string,
  newCoverPositionY: number = 50
): Promise<void> {
  const username = usernameRaw.trim().toLowerCase();
  await updateDoc(doc(firestoreDb, 'students', username), {
    coverUrl: newCoverUrl,
    coverPositionY: newCoverPositionY,
  });
  const curr = getCurrentUser();
  if (curr && curr.username.toLowerCase() === username) {
    const updated = {
      ...curr,
      coverUrl: newCoverUrl,
      coverPositionY: newCoverPositionY,
    };
    setCurrentUser(updated);
  }
}

/**
 * Record a profile view event when student A visits student B's profile.
 */
export async function recordProfileView(viewedUsernameRaw: string, viewer: StudentUser): Promise<void> {
  const viewedUsername = viewedUsernameRaw.trim().toLowerCase();
  const viewerUsername = viewer.username.trim().toLowerCase();

  // Don't record self-views
  if (viewedUsername === viewerUsername) return;

  try {
    const viewRef = doc(firestoreDb, 'students', viewedUsername, 'profile_views', viewerUsername);
    const viewRecord: ProfileViewRecord = {
      viewerUsername: viewer.username,
      viewerDisplayName: viewer.displayName,
      viewerAvatar: viewer.avatarUrl,
      timestamp: Date.now(),
    };
    await setDoc(viewRef, sanitizeFirestoreData(viewRecord));
  } catch (err) {
    console.warn('Record profile view notice:', err);
  }
}

/**
 * Real-time listener for profile views of a given student.
 */
export function subscribeToProfileViews(
  usernameRaw: string,
  callback: (views: ProfileViewRecord[]) => void
): () => void {
  const username = usernameRaw.trim().toLowerCase();
  try {
    const q = query(
      collection(firestoreDb, 'students', username, 'profile_views'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const viewsList: ProfileViewRecord[] = [];
        snapshot.forEach((d) => {
          viewsList.push(d.data() as ProfileViewRecord);
        });
        callback(viewsList);
      },
      (error) => {
        console.warn('Profile views listener notice:', error.message);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Error attaching profile views subscriber:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Get student details by username.
 */
export async function getStudentByUsername(usernameRaw: string): Promise<StudentUser | null> {
  const username = usernameRaw.trim().toLowerCase();
  try {
    const docRef = doc(firestoreDb, 'students', username);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as StudentUser;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching student profile:', err);
    return null;
  }
}

// ==========================================
// STUDY PLAYGROUND & NOTES
// ==========================================

export function subscribeToNotes(callback: (notes: StudyNote[]) => void): () => void {
  try {
    const q = query(
      collection(firestoreDb, 'study_notes'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notesList: StudyNote[] = [];
        snapshot.forEach((d) => {
          notesList.push({ id: d.id, ...d.data() } as StudyNote);
        });
        callback(notesList);
      },
      (error) => {
        console.warn('Realtime notes listener status:', error.message);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Error attaching notes subscriber:', err);
    callback([]);
    return () => {};
  }
}

export async function createStudyNote(params: {
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
}): Promise<StudyNote> {
  const newNote: StudyNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: params.title.trim(),
    content: params.content.trim(),
    authorUsername: params.authorUsername,
    authorDisplayName: params.authorDisplayName,
    authorAvatar: params.authorAvatar,
    categoryTag: '',
    imageUrl: params.imageUrl || (params.imageUrls && params.imageUrls[0]),
    imageUrls: params.imageUrls && params.imageUrls.length > 0 ? params.imageUrls : (params.imageUrl ? [params.imageUrl] : undefined),
    imageOriginalSize: params.imageOriginalSize,
    imageCompressedSize: params.imageCompressedSize,
    videoUrl: params.videoUrl,
    likesCount: 0,
    likedBy: [],
    reactions: {},
    commentsCount: 0,
    createdAt: Date.now(),
  };

  await setDoc(doc(firestoreDb, 'study_notes', newNote.id), sanitizeFirestoreData(newNote));

  try {
    await updateDoc(doc(firestoreDb, 'students', params.authorUsername), {
      totalNotesShared: increment(1),
    });
  } catch (e) {
    console.warn('Notice: Note count updated in note document:', e);
  }

  const curr = getCurrentUser();
  if (curr && curr.username === params.authorUsername) {
    curr.totalNotesShared = (curr.totalNotesShared || 0) + 1;
    setCurrentUser(curr);
  }

  return newNote;
}

export async function deleteStudyNote(noteId: string, authorUsername: string): Promise<void> {
  await deleteDoc(doc(firestoreDb, 'study_notes', noteId));

  try {
    await updateDoc(doc(firestoreDb, 'students', authorUsername), {
      totalNotesShared: increment(-1),
    });
  } catch (e) {
    console.warn('Author note count decrement sync:', e);
  }

  const curr = getCurrentUser();
  if (curr && curr.username === authorUsername) {
    curr.totalNotesShared = Math.max(0, (curr.totalNotesShared || 1) - 1);
    setCurrentUser(curr);
  }
}

/**
 * Toggle or change multi-emoji reaction on a study note.
 */
export async function toggleNoteReaction(params: {
  noteId: string;
  user: StudentUser;
  reactionType: ReactionType;
}): Promise<{ reactions: Record<string, ReactionType>; likesCount: number }> {
  const noteRef = doc(firestoreDb, 'study_notes', params.noteId);
  const snap = await getDoc(noteRef);

  if (!snap.exists()) {
    throw new Error('Note does not exist');
  }

  const noteData = snap.data() as StudyNote;
  const currentReactions: Record<string, ReactionType> = noteData.reactions || {};
  const currentChoice = currentReactions[params.user.username];

  let isNewReaction = false;
  const updatedReactions = { ...currentReactions };

  if (currentChoice === params.reactionType) {
    // If student clicks exact same reaction emoji, toggle off
    delete updatedReactions[params.user.username];
  } else {
    // Add or switch to new reaction
    if (!currentChoice) isNewReaction = true;
    updatedReactions[params.user.username] = params.reactionType;
  }

  const newLikedBy = Object.keys(updatedReactions);
  const newLikesCount = newLikedBy.length;
  const delta = newLikesCount - (noteData.likesCount || 0);

  await updateDoc(noteRef, {
    reactions: updatedReactions,
    likedBy: newLikedBy,
    likesCount: newLikesCount,
  });

  // If a new reaction was added (and not removed), send a notification to note author
  if (isNewReaction && currentChoice !== params.reactionType) {
    sendNotification({
      recipientUsername: noteData.authorUsername,
      actorUsername: params.user.username,
      actorDisplayName: params.user.displayName,
      actorAvatar: params.user.avatarUrl,
      type: 'reaction',
      reactionType: params.reactionType,
      noteId: params.noteId,
      noteTitle: noteData.title,
    });
  }

  // Sync author total likes count if changed
  if (delta !== 0) {
    try {
      await updateDoc(doc(firestoreDb, 'students', noteData.authorUsername), {
        totalLikesReceived: increment(delta),
      });
    } catch (e) {
      console.warn('Note author likes count update sync:', e);
    }
  }

  return { reactions: updatedReactions, likesCount: newLikesCount };
}

export async function toggleLikeNote(
  noteId: string,
  username: string
): Promise<{ liked: boolean; newLikesCount: number }> {
  const noteRef = doc(firestoreDb, 'study_notes', noteId);
  const snap = await getDoc(noteRef);

  if (!snap.exists()) {
    throw new Error('Note does not exist');
  }

  const noteData = snap.data() as StudyNote;
  const hasLiked = noteData.likedBy?.includes(username) || false;
  const delta = hasLiked ? -1 : 1;
  const newLikesCount = Math.max(0, (noteData.likesCount || 0) + delta);

  const updatedReactions = { ...(noteData.reactions || {}) };
  if (hasLiked) {
    delete updatedReactions[username];
    await updateDoc(noteRef, {
      likedBy: arrayRemove(username),
      reactions: updatedReactions,
      likesCount: increment(-1),
    });
  } else {
    updatedReactions[username] = 'like';
    await updateDoc(noteRef, {
      likedBy: arrayUnion(username),
      reactions: updatedReactions,
      likesCount: increment(1),
    });
  }

  try {
    await updateDoc(doc(firestoreDb, 'students', noteData.authorUsername), {
      totalLikesReceived: increment(delta),
    });
  } catch (e) {
    console.warn('Note author likes update sync:', e);
  }

  const curr = getCurrentUser();
  if (curr && curr.username === noteData.authorUsername) {
    curr.totalLikesReceived = Math.max(0, (curr.totalLikesReceived || 0) + delta);
    setCurrentUser(curr);
  }

  return { liked: !hasLiked, newLikesCount };
}

// ==========================================
// COMMENTS & REPLIES
// ==========================================

export function subscribeToNoteComments(
  noteId: string,
  callback: (comments: NoteComment[]) => void
): () => void {
  try {
    const q = query(
      collection(firestoreDb, 'study_notes', noteId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(150)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const commentsList: NoteComment[] = [];
        snapshot.forEach((d) => {
          commentsList.push({ id: d.id, ...d.data() } as NoteComment);
        });
        callback(commentsList);
      },
      (error) => {
        console.warn('Comments listener notice:', error.message);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Error attaching comments subscriber:', err);
    callback([]);
    return () => {};
  }
}

export async function addNoteComment(params: {
  noteId: string;
  text: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  replyToCommentId?: string | null;
  replyToUsername?: string | null;
  noteAuthorUsername?: string;
  noteTitle?: string;
}): Promise<NoteComment> {
  const newComment: NoteComment = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    noteId: params.noteId,
    text: params.text.trim(),
    authorUsername: params.authorUsername,
    authorDisplayName: params.authorDisplayName,
    authorAvatar: params.authorAvatar,
    replyToCommentId: params.replyToCommentId || null,
    replyToUsername: params.replyToUsername || null,
    createdAt: Date.now(),
  };

  await setDoc(
    doc(firestoreDb, 'study_notes', params.noteId, 'comments', newComment.id),
    sanitizeFirestoreData(newComment)
  );

  try {
    await updateDoc(doc(firestoreDb, 'study_notes', params.noteId), {
      commentsCount: increment(1),
    });
  } catch (e) {
    console.warn('Note commentsCount increment notice:', e);
  }

  // Send real-time notification to note author
  if (params.noteAuthorUsername && params.noteAuthorUsername !== params.authorUsername) {
    sendNotification({
      recipientUsername: params.noteAuthorUsername,
      actorUsername: params.authorUsername,
      actorDisplayName: params.authorDisplayName,
      actorAvatar: params.authorAvatar,
      type: 'comment',
      noteId: params.noteId,
      noteTitle: params.noteTitle || 'Study Note',
      commentText: params.text.trim(),
    });
  }

  return newComment;
}

export async function deleteNoteComment(noteId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(firestoreDb, 'study_notes', noteId, 'comments', commentId));

  try {
    await updateDoc(doc(firestoreDb, 'study_notes', noteId), {
      commentsCount: increment(-1),
    });
  } catch (e) {
    console.warn('Note commentsCount decrement notice:', e);
  }
}

// ==========================================
// REAL-TIME GLOBAL CHAT WITH REPLIES
// ==========================================

export function subscribeToGlobalChat(callback: (messages: ChatMessage[]) => void): () => void {
  try {
    const q = query(
      collection(firestoreDb, 'global_chat'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((d) => {
          msgs.push({ id: d.id, ...d.data() } as ChatMessage);
        });
        callback(msgs);
      },
      (err) => {
        console.warn('Global chat listener notice:', err.message);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Error attaching chat subscriber:', err);
    callback([]);
    return () => {};
  }
}

export async function sendGlobalChatMessage(params: {
  text: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  replyToMessageId?: string | null;
  replyToUsername?: string | null;
  replyToText?: string | null;
}): Promise<ChatMessage> {
  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text: params.text.trim(),
    authorUsername: params.authorUsername,
    authorDisplayName: params.authorDisplayName,
    authorAvatar: params.authorAvatar,
    replyToMessageId: params.replyToMessageId || null,
    replyToUsername: params.replyToUsername || null,
    replyToText: params.replyToText || null,
    createdAt: Date.now(),
  };

  await addDoc(collection(firestoreDb, 'global_chat'), sanitizeFirestoreData(newMsg));
  return newMsg;
}

// ==========================================
// REAL-TIME LEADERBOARD COMPUTATION
// ==========================================

export interface LeaderboardEntry {
  username: string;
  displayName: string;
  avatarUrl: string;
  likes: number;
  notes: number;
  rank: number;
}

export function computeLeaderboardFromNotes(
  notes: StudyNote[],
  studentAvatars?: Record<string, string>,
  studentNames?: Record<string, string>
): LeaderboardEntry[] {
  if (!notes || notes.length === 0) return [];

  const authorMap: Record<string, LeaderboardEntry> = {};

  for (const n of notes) {
    const lowerUser = n.authorUsername.toLowerCase();
    const liveAvatar =
      (studentAvatars && studentAvatars[lowerUser]) || n.authorAvatar;
    const liveName =
      (studentNames && studentNames[lowerUser]) || n.authorDisplayName;

    if (!authorMap[n.authorUsername]) {
      authorMap[n.authorUsername] = {
        username: n.authorUsername,
        displayName: liveName,
        avatarUrl: liveAvatar,
        likes: 0,
        notes: 0,
        rank: 0,
      };
    } else {
      authorMap[n.authorUsername].displayName = liveName;
      authorMap[n.authorUsername].avatarUrl = liveAvatar;
    }
    authorMap[n.authorUsername].likes += n.likesCount || 0;
    authorMap[n.authorUsername].notes += 1;
  }

  const sorted = Object.values(authorMap).sort((a, b) => {
    if (b.likes !== a.likes) return b.likes - a.likes;
    return b.notes - a.notes;
  });

  return sorted.slice(0, 10).map((item, idx) => ({
    ...item,
    displayName:
      (studentNames && studentNames[item.username.toLowerCase()]) || item.displayName,
    avatarUrl:
      (studentAvatars && studentAvatars[item.username.toLowerCase()]) || item.avatarUrl,
    rank: idx + 1,
  }));
}

