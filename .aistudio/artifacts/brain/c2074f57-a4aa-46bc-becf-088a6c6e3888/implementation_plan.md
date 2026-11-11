# Cover Photo Drag-to-Reposition & UI Text Cleanup Plan (Completed)

Successfully removed all third-party brand labels from user-facing UI copy and implemented an interactive drag-to-reposition experience for profile cover photos with vertical movement and instant saving.

## Completed Features

1. **Unnecessary Text Removed**:
   - Replaced "TikTok style" in profile visitor trackers and modal descriptions with clean, native copy: `"See who viewed your profile"` and `"Only you can see students who viewed your profile."`
   - Replaced "Facebook-style grid" in note attachments with `"✓ Photo collage grid enabled"` and `"Attach 1 to 20+ study photos or diagrams"`.

2. **Cover Photo Drag-to-Reposition**:
   - Extended `StudentUser` interface with `coverPositionY?: number`.
   - Updated `updateStudentCoverPhoto` and created `updateStudentCoverPosition` in `src/services/firebase.ts`.
   - In `StudentProfileView.tsx`:
     - Built drag-to-reposition engine supporting both mouse and touch dragging (`onMouseDown`, `onMouseMove`, `onMouseUp`, `onTouchStart`, `onTouchMove`, `onTouchEnd`).
     - Added floating guide: `"Drag up or down to reposition cover"` with animated vertical move icon.
     - Provided **"Save Position"** and **"Cancel"** buttons.
     - Added a dedicated **"Reposition"** button alongside "Change Cover".
     - Automatically prompts the user into reposition mode immediately upon selecting a new photo.
     - Persists and syncs `coverPositionY` percentage (0% to 100%) so the exact chosen position renders consistently across sessions.
   - In `ProfileView.tsx`:
     - Applied `coverPositionY` styling to the cover image.
