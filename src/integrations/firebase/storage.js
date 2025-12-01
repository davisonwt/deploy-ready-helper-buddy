/**
 * Firebase Storage Utilities
 * Handles file uploads (photos, voice notes, videos)
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "./config";

/**
 * Upload photo to user's storage
 * Path: users/{userId}/photos/{filename}
 */
export async function uploadUserPhoto(userId, file, onProgress = null) {
  try {
    const timestamp = Date.now();
    const filename = `photo_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `users/${userId}/photos/${filename}`);
    
    let uploadTask;
    if (onProgress) {
      // Use resumable upload for progress tracking
      uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          throw error;
        }
      );
      
      await uploadTask;
    } else {
      // Simple upload
      await uploadBytes(storageRef, file);
    }
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return { success: true, url: downloadURL, filename };
  } catch (error) {
    console.error("Error uploading photo:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload voice note to user's storage
 * Path: users/{userId}/voice/{filename}
 */
export async function uploadVoiceNote(userId, file, onProgress = null) {
  try {
    const timestamp = Date.now();
    const filename = `voice_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `users/${userId}/voice/${filename}`);
    
    let uploadTask;
    if (onProgress) {
      uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          throw error;
        }
      );
      
      await uploadTask;
    } else {
      await uploadBytes(storageRef, file);
    }
    
    const downloadURL = await getDownloadURL(storageRef);
    
    return { success: true, url: downloadURL, filename };
  } catch (error) {
    console.error("Error uploading voice note:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload video to user's storage
 * Path: users/{userId}/videos/{filename}
 */
export async function uploadVideo(userId, file, onProgress = null) {
  try {
    const timestamp = Date.now();
    const filename = `video_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `users/${userId}/videos/${filename}`);
    
    let uploadTask;
    if (onProgress) {
      uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          throw error;
        }
      );
      
      await uploadTask;
    } else {
      await uploadBytes(storageRef, file);
    }
    
    const downloadURL = await getDownloadURL(storageRef);
    
    return { success: true, url: downloadURL, filename };
  } catch (error) {
    console.error("Error uploading video:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload photo to Remnant Wall
 * Path: remnant_wall/{postId}/{filename}
 */
export async function uploadRemnantWallPhoto(postId, file, onProgress = null) {
  try {
    const timestamp = Date.now();
    const filename = `photo_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `remnant_wall/${postId}/${filename}`);
    
    let uploadTask;
    if (onProgress) {
      uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          throw error;
        }
      );
      
      await uploadTask;
    } else {
      await uploadBytes(storageRef, file);
    }
    
    const downloadURL = await getDownloadURL(storageRef);
    
    return { success: true, url: downloadURL, filename };
  } catch (error) {
    console.error("Error uploading Remnant Wall photo:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(filePath) {
  try {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get download URL for a file
 */
export async function getFileURL(filePath) {
  try {
    const storageRef = ref(storage, filePath);
    const url = await getDownloadURL(storageRef);
    return { success: true, url };
  } catch (error) {
    console.error("Error getting file URL:", error);
    return { success: false, error: error.message };
  }
}

