// Enhanced video processing utility with compression and thumbnail generation
import { loadImage } from '@/utils/backgroundRemoval';

// Supported video formats and their optimal settings
const VIDEO_FORMATS = {
  'video/mp4': { extension: 'mp4', codec: 'video/mp4' },
  'video/webm': { extension: 'webm', codec: 'video/webm;codecs=vp9' },
  'video/mov': { extension: 'mov', codec: 'video/mp4' },
  'video/avi': { extension: 'avi', codec: 'video/mp4' }
};

// Compression presets for different quality levels
const COMPRESSION_PRESETS = {
  high: { bitrate: 2000000, fps: 30, quality: 0.9 },
  medium: { bitrate: 1000000, fps: 25, quality: 0.8 },
  low: { bitrate: 500000, fps: 20, quality: 0.7 }
};

/**
 * Enhanced video compression with configurable options
 * @param {File} file - Video file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} Compressed video file
 */
export async function compressVideoAdvanced(file, options = {}) {
  const {
    maxSizeMB = 50,
    maxDuration = 300,
    quality = 'medium',
    targetWidth = null,
    targetHeight = null,
    onProgress = null
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      // Validate file format
      if (!file.type.startsWith('video/')) {
        throw new Error('Invalid file type. Only video files are supported.');
      }

      const fileSizeMB = file.size / (1024 * 1024);
      
      // Return original file if already within limits
      if (fileSizeMB <= maxSizeMB && file.duration <= maxDuration) {
        console.log('📹 Video size acceptable, no compression needed');
        onProgress?.(100, 'Complete');
        resolve(file);
        return;
      }

      console.log(`📹 Compressing video: ${fileSizeMB.toFixed(2)}MB -> target: ${maxSizeMB}MB`);
      onProgress?.(10, 'Loading video');

      const video = await loadVideoElement(file);
      const preset = COMPRESSION_PRESETS[quality] || COMPRESSION_PRESETS.medium;
      
      onProgress?.(20, 'Analyzing video');

      // Calculate optimal dimensions
      const { width, height } = calculateOptimalDimensions(
        video.videoWidth, 
        video.videoHeight, 
        targetWidth, 
        targetHeight,
        fileSizeMB
      );

      onProgress?.(30, 'Setting up compression');

      // Create canvas for processing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Setup MediaRecorder with optimal settings
      const stream = canvas.captureStream(preset.fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: getOptimalMimeType(),
        videoBitsPerSecond: preset.bitrate
      });

      const chunks = [];
      let recordingProgress = 0;
      const duration = Math.min(video.duration, maxDuration);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        onProgress?.(90, 'Finalizing');
        
        const mimeType = getOptimalMimeType();
        const compressedBlob = new Blob(chunks, { type: mimeType });
        const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
        const compressedFile = new File([compressedBlob], `compressed_video.${extension}`, {
          type: mimeType
        });
        
        const newSizeMB = compressedFile.size / (1024 * 1024);
        console.log(`✅ Video compressed to: ${newSizeMB.toFixed(2)}MB`);
        onProgress?.(100, 'Complete');
        
        resolve(compressedFile);
      };

      mediaRecorder.onerror = (error) => {
        console.error('❌ MediaRecorder error:', error);
        reject(new Error('Video compression failed'));
      };

      // Start recording and processing
      mediaRecorder.start();
      video.currentTime = 0;
      
      const processFrame = () => {
        if (video.currentTime < duration && !video.ended) {
          ctx.drawImage(video, 0, 0, width, height);
          
          recordingProgress = (video.currentTime / duration) * 60; // 60% of progress for recording
          onProgress?.(30 + recordingProgress, 'Compressing frames');
          
          requestAnimationFrame(processFrame);
        } else {
          mediaRecorder.stop();
        }
      };

      video.ontimeupdate = processFrame;
      video.play();

      // Stop after duration
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, duration * 1000);

    } catch (error) {
      console.error('❌ Video compression error:', error);
      reject(error);
    }
  });
}

/**
 * Generate thumbnails from video at specified intervals
 * @param {File} file - Video file
 * @param {Object} options - Thumbnail options
 * @returns {Promise<Array>} Array of thumbnail blobs
 */
export async function generateVideoThumbnails(file, options = {}) {
  const {
    interval = 10, // seconds
    maxThumbnails = 10,
    width = 320,
    height = 180,
    format = 'jpeg',
    quality = 0.8,
    onProgress = null
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      onProgress?.(10, 'Loading video for thumbnails');

      const video = await loadVideoElement(file);
      const duration = video.duration;
      const thumbnails = [];
      
      // Calculate thumbnail timestamps
      const timestamps = [];
      for (let i = 0; i < Math.min(Math.floor(duration / interval), maxThumbnails); i++) {
        timestamps.push(i * interval);
      }

      // Always include first and last frame
      if (!timestamps.includes(0)) timestamps.unshift(0);
      if (!timestamps.includes(duration - 1)) timestamps.push(duration - 1);

      onProgress?.(20, 'Creating thumbnails');

      // Create canvas for thumbnail generation
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        
        await new Promise((resolve) => {
          video.onseeked = () => {
            // Draw frame to canvas
            ctx.drawImage(video, 0, 0, width, height);
            
            // Convert to blob
            canvas.toBlob((blob) => {
              thumbnails.push({
                blob,
                timestamp,
                url: URL.createObjectURL(blob)
              });
              
              const progress = 20 + ((i + 1) / timestamps.length) * 70;
              onProgress?.(progress, `Generated thumbnail ${i + 1}/${timestamps.length}`);
              
              resolve();
            }, `image/${format}`, quality);
          };
          
          video.currentTime = timestamp;
        });
      }

      onProgress?.(100, 'Thumbnails complete');
      resolve(thumbnails);

    } catch (error) {
      console.error('❌ Thumbnail generation error:', error);
      reject(error);
    }
  });
}

/**
 * Extract video metadata
 * @param {File} file - Video file
 * @returns {Promise<Object>} Video metadata
 */
export async function extractVideoMetadata(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const video = await loadVideoElement(file);
      
      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: video.videoWidth / video.videoHeight,
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type,
        lastModified: file.lastModified
      };

      resolve(metadata);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Process video with compression and thumbnail generation
 * @param {File} file - Video file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing results
 */
export async function processVideo(file, options = {}) {
  const {
    compress = true,
    generateThumbnails = true,
    compressionOptions = {},
    thumbnailOptions = {},
    onProgress = null
  } = options;

  try {
    onProgress?.(5, 'Starting video processing');

    // Extract metadata first
    const metadata = await extractVideoMetadata(file);
    onProgress?.(10, 'Metadata extracted');

    let compressedFile = file;
    let thumbnails = [];

    // Compress video if requested
    if (compress) {
      compressedFile = await compressVideoAdvanced(file, {
        ...compressionOptions,
        onProgress: (progress, message) => {
          onProgress?.(10 + (progress * 0.5), `Compression: ${message}`);
        }
      });
    }

    // Generate thumbnails if requested
    if (generateThumbnails) {
      thumbnails = await generateVideoThumbnails(file, {
        ...thumbnailOptions,
        onProgress: (progress, message) => {
          onProgress?.(60 + (progress * 0.35), `Thumbnails: ${message}`);
        }
      });
    }

    onProgress?.(100, 'Processing complete');

    return {
      originalFile: file,
      compressedFile,
      thumbnails,
      metadata,
      compressionRatio: file.size / compressedFile.size
    };

  } catch (error) {
    console.error('❌ Video processing error:', error);
    throw error;
  }
}

// Helper functions

function loadVideoElement(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error('Failed to load video'));
    
    video.src = URL.createObjectURL(file);
  });
}

function calculateOptimalDimensions(videoWidth, videoHeight, targetWidth, targetHeight, fileSizeMB) {
  let width = videoWidth;
  let height = videoHeight;
  const aspectRatio = videoWidth / videoHeight;

  // Apply target dimensions if specified
  if (targetWidth && targetHeight) {
    width = targetWidth;
    height = targetHeight;
  } else if (targetWidth) {
    width = targetWidth;
    height = width / aspectRatio;
  } else if (targetHeight) {
    height = targetHeight;
    width = height * aspectRatio;
  }

  // Automatically reduce resolution for large files
  if (fileSizeMB > 100 && width > 1920) {
    width = 1920;
    height = width / aspectRatio;
  } else if (fileSizeMB > 50 && width > 1280) {
    width = 1280;
    height = width / aspectRatio;
  } else if (fileSizeMB > 20 && width > 720) {
    width = 720;
    height = width / aspectRatio;
  }

  // Ensure dimensions are even numbers (required for some codecs)
  width = Math.floor(width / 2) * 2;
  height = Math.floor(height / 2) * 2;

  return { width, height };
}

function getOptimalMimeType() {
  // Check browser support for different codecs
  const testRecorder = (mimeType) => {
    try {
      return MediaRecorder.isTypeSupported(mimeType);
    } catch {
      return false;
    }
  };

  // Prefer VP9 for better compression, fallback to VP8, then H.264
  if (testRecorder('video/webm;codecs=vp9')) {
    return 'video/webm;codecs=vp9';
  } else if (testRecorder('video/webm;codecs=vp8')) {
    return 'video/webm;codecs=vp8';
  } else if (testRecorder('video/mp4;codecs=h264')) {
    return 'video/mp4;codecs=h264';
  } else {
    return 'video/webm'; // Fallback
  }
}

// Utility function to validate video format
export function validateVideoFile(file) {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }
  
  if (!file.type.startsWith('video/')) {
    errors.push('File must be a video');
  }
  
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) {
    errors.push('File size exceeds 500MB limit');
  }
  
  const supportedFormats = Object.keys(VIDEO_FORMATS);
  if (!supportedFormats.includes(file.type)) {
    errors.push(`Unsupported format. Supported formats: ${supportedFormats.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}