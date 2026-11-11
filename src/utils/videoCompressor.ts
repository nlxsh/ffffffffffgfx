/**
 * Client-side video compressor using native Browser APIs (Canvas + MediaRecorder).
 * Aims to compress videos to under 1MB for Firestore storage as Data URLs.
 */

export interface VideoCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  videoBitsPerSecond?: number;
  onProgress?: (progress: number) => void;
}

export interface VideoCompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
}

export async function compressVideo(
  file: File,
  options: VideoCompressionOptions = {}
): Promise<VideoCompressionResult> {
  const {
    maxWidth = 480, // Lower resolution for extreme compression
    maxHeight = 480,
    videoBitsPerSecond = 500000, // 500kbps - targets ~50KB per second of video
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Calculate scaled dimensions
      let width = video.videoWidth;
      let height = video.videoHeight;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const stream = canvas.captureStream(24); // 24 FPS
      
      // Select best supported codec
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      const selectedMimeType = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: videoBitsPerSecond,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const compressedBlob = new Blob(chunks, { type: selectedMimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          URL.revokeObjectURL(objectUrl);
          resolve({
            dataUrl,
            originalSize: file.size,
            compressedSize: compressedBlob.size,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(compressedBlob);
      };

      video.onplay = () => {
        const draw = () => {
          if (video.paused || video.ended) {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
            return;
          }
          ctx.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(draw);
        };
        draw();
      };

      mediaRecorder.start();
      video.play().catch(reject);
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Video loading failed'));
    };
  });
}
