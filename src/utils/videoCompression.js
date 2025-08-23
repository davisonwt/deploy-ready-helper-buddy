// Video compression utility to handle large video files
export async function compressVideo(file, maxSizeMB = 50, maxDuration = 300) {
  return new Promise((resolve, reject) => {
    // Check if file size is already acceptable
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB <= maxSizeMB) {
      console.log('📹 Video size acceptable, no compression needed');
      resolve(file);
      return;
    }

    console.log(`📹 Compressing video: ${fileSizeMB.toFixed(2)}MB -> target: ${maxSizeMB}MB`);

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.onloadedmetadata = () => {
      const duration = Math.min(video.duration, maxDuration);
      const aspectRatio = video.videoWidth / video.videoHeight;
      
      // Set reasonable dimensions to reduce file size
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      // Limit resolution for very large videos
      if (width > 1920) {
        width = 1920;
        height = width / aspectRatio;
      } else if (width > 1280 && fileSizeMB > 100) {
        width = 1280;
        height = width / aspectRatio;
      }
      
      canvas.width = width;
      canvas.height = height;

      const mediaRecorder = setupMediaRecorder(canvas, duration, resolve, reject);
      
      video.currentTime = 0;
      video.play();

      const recordFrame = () => {
        if (video.currentTime < duration && !video.ended) {
          ctx.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(recordFrame);
        } else {
          mediaRecorder.stop();
        }
      };

      video.onseeked = recordFrame;
      video.ontimeupdate = recordFrame;
    };

    video.onerror = (error) => {
      console.error('❌ Video compression error:', error);
      reject(new Error('Failed to load video for compression'));
    };

    video.src = URL.createObjectURL(file);
  });
}

function setupMediaRecorder(canvas, duration, resolve, reject) {
  const chunks = [];
  const stream = canvas.captureStream(25); // 25 FPS
  
  // Use lower bitrate for compression
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp8',
    videoBitsPerSecond: 1000000 // 1 Mbps
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const compressedBlob = new Blob(chunks, { type: 'video/webm' });
    const compressedFile = new File([compressedBlob], 'compressed_video.webm', {
      type: 'video/webm'
    });
    
    const newSizeMB = compressedFile.size / (1024 * 1024);
    console.log(`✅ Video compressed to: ${newSizeMB.toFixed(2)}MB`);
    
    resolve(compressedFile);
  };

  mediaRecorder.onerror = (error) => {
    console.error('❌ MediaRecorder error:', error);
    reject(new Error('Video compression failed'));
  };

  mediaRecorder.start();
  
  // Stop recording after duration
  setTimeout(() => {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }, duration * 1000);

  return mediaRecorder;
}

// Alternative simpler compression using canvas resizing
export async function simpleVideoCompress(file, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Reduce dimensions by quality factor
      canvas.width = video.videoWidth * quality;
      canvas.height = video.videoHeight * quality;
      
      video.currentTime = 0;
      
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'video/mp4'
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress video'));
          }
        }, 'video/mp4', quality);
      };
    };

    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}