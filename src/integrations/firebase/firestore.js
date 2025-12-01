/**
 * Firestore Database Utilities
 * Handles all Firestore operations for the Remnant app
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

/**
 * ============================================
 * JOURNAL ENTRIES
 * ============================================
 */

/**
 * Save journal entry to Firestore
 * Path: journal/{userId}/{yhwhDate}
 */
export async function saveJournalEntry(userId, yhwhDate, entryData) {
  try {
    const entryRef = doc(db, "journal", userId, "entries", yhwhDate);
    await setDoc(entryRef, {
      ...entryData,
      updatedAt: serverTimestamp(),
      createdAt: entryData.createdAt || serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error saving journal entry:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get journal entry for specific YHWH date
 */
export async function getJournalEntry(userId, yhwhDate) {
  try {
    const entryRef = doc(db, "journal", userId, "entries", yhwhDate);
    const entrySnap = await getDoc(entryRef);
    
    if (entrySnap.exists()) {
      return { success: true, data: entrySnap.data() };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error("Error getting journal entry:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all journal entries for a user
 */
export async function getUserJournalEntries(userId, limitCount = 100) {
  try {
    const entriesRef = collection(db, "journal", userId, "entries");
    const q = query(entriesRef, orderBy("createdAt", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const entries = [];
    querySnapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: entries };
  } catch (error) {
    console.error("Error getting journal entries:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ============================================
 * REMNANT WALL (Public Feed)
 * ============================================
 */

/**
 * Post to Remnant Wall
 */
export async function postToRemnantWall(postData) {
  try {
    const wallRef = doc(collection(db, "remnant_wall"));
    await setDoc(wallRef, {
      ...postData,
      createdAt: serverTimestamp(),
      likes: [],
    });
    return { success: true, postId: wallRef.id };
  } catch (error) {
    console.error("Error posting to Remnant Wall:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Remnant Wall posts (newest first)
 */
export async function getRemnantWallPosts(limitCount = 50) {
  try {
    const wallRef = collection(db, "remnant_wall");
    const q = query(wallRef, orderBy("createdAt", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: posts };
  } catch (error) {
    console.error("Error getting Remnant Wall posts:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Remnant Wall posts for specific YHWH date
 */
export async function getRemnantWallPostsByDate(yhwhDate) {
  try {
    const wallRef = collection(db, "remnant_wall");
    const q = query(wallRef, where("yhwhDate", "==", yhwhDate), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: posts };
  } catch (error) {
    console.error("Error getting Remnant Wall posts by date:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Like/unlike a Remnant Wall post
 */
export async function toggleLikeRemnantPost(postId, userId) {
  try {
    const postRef = doc(db, "remnant_wall", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return { success: false, error: "Post not found" };
    }
    
    const currentLikes = postSnap.data().likes || [];
    const isLiked = currentLikes.includes(userId);
    
    if (isLiked) {
      await updateDoc(postRef, {
        likes: arrayRemove(userId),
      });
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(userId),
      });
    }
    
    return { success: true, liked: !isLiked };
  } catch (error) {
    console.error("Error toggling like:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a Remnant Wall post (only by author)
 */
export async function deleteRemnantPost(postId) {
  try {
    await deleteDoc(doc(db, "remnant_wall", postId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ============================================
 * TORAH GROUPS
 * ============================================
 */

/**
 * Create a Torah study group
 */
export async function createTorahGroup(groupData) {
  try {
    const groupRef = doc(collection(db, "torah_groups"));
    await setDoc(groupRef, {
      ...groupData,
      createdAt: serverTimestamp(),
      members: [groupData.hostUID],
    });
    return { success: true, groupId: groupRef.id };
  } catch (error) {
    console.error("Error creating Torah group:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all Torah groups
 */
export async function getTorahGroups() {
  try {
    const groupsRef = collection(db, "torah_groups");
    const querySnapshot = await getDocs(groupsRef);
    
    const groups = [];
    querySnapshot.forEach((doc) => {
      groups.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: groups };
  } catch (error) {
    console.error("Error getting Torah groups:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ============================================
 * LIVE TEQUVAH PHOTOS
 * ============================================
 */

/**
 * Post sunrise photo to live tequvah collection
 */
export async function postTequvahPhoto(year, photoData) {
  try {
    const collectionName = `live_tequvah_${year}`;
    const photoRef = doc(collection(db, collectionName));
    await setDoc(photoRef, {
      ...photoData,
      createdAt: serverTimestamp(),
    });
    return { success: true, photoId: photoRef.id };
  } catch (error) {
    console.error("Error posting tequvah photo:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get live tequvah photos for a year
 */
export async function getTequvahPhotos(year, limitCount = 100) {
  try {
    const collectionName = `live_tequvah_${year}`;
    const photosRef = collection(db, collectionName);
    const q = query(photosRef, orderBy("createdAt", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const photos = [];
    querySnapshot.forEach((doc) => {
      photos.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: photos };
  } catch (error) {
    console.error("Error getting tequvah photos:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ============================================
 * USER PROFILES
 * ============================================
 */

/**
 * Get user profile
 */
export async function getUserProfile(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { success: true, data: userSnap.data() };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error("Error getting user profile:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId, profileData) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: error.message };
  }
}

