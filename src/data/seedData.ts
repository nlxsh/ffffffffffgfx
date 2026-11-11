import { StudentUser, StudyNote } from '../types';

// Default Avatars with clean geometric SVG data URLs for instant fallback
export const defaultAvatarUrls = [
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="%231E2024"/><circle cx="48" cy="38" r="18" fill="%23C5C9D3"/><path d="M22 80c0-14 12-24 26-24s26 10 26 24" fill="%23C5C9D3"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="%2324272D"/><circle cx="48" cy="38" r="18" fill="%23D8DBE2"/><path d="M24 78c0-13 11-22 24-22s24 9 24 22" fill="%23D8DBE2"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="%2316181C"/><circle cx="48" cy="38" r="18" fill="%23A8ACB6"/><path d="M20 82c0-15 13-26 28-26s28 11 28 26" fill="%23A8ACB6"/></svg>',
];

// All demo/mock data purged as requested: 100% clean initial state
export const initialUsers: StudentUser[] = [];
export const initialNotes: StudyNote[] = [];

