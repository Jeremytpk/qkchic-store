import { storage, db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { encryptFile } from './encryption.js';
import { 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    deleteObject,
    listAll 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    query, 
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Upload file to Firebase Storage
export async function uploadFile(file, password, onProgress) {
    const user = getCurrentUser();
    console.log('uploadFile - Starting upload for:', file.name);
    console.log('uploadFile - Current user:', user);
    
    if (!user) {
        console.error('uploadFile - No user authenticated');
        return { success: false, error: 'User not authenticated' };
    }

    try {
        console.log('uploadFile - Encrypting file...');
        // Encrypt the file first
        const encryptedFile = await encryptFile(file, password);
        console.log('uploadFile - File encrypted:', encryptedFile.name);
        
        // Create a reference to the file in storage
        const timestamp = Date.now();
        const fileName = `${timestamp}_${encryptedFile.name}`;
        const storageRef = ref(storage, `users/${user.uid}/${fileName}`);
        console.log('uploadFile - Storage path:', storageRef.fullPath);

        // Upload file with progress tracking
        const uploadTask = uploadBytesResumable(storageRef, encryptedFile);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progress tracking
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) {
                        onProgress(progress);
                    }
                },
                (error) => {
                    // Error handling
                    reject({ success: false, error: error.message });
                },
                async () => {
                    // Upload completed successfully
                    try {
                        console.log('uploadFile - Upload complete, getting download URL...');
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log('uploadFile - Download URL:', downloadURL);
                        
                        // Save metadata to Firestore in 'files' collection
                        console.log('uploadFile - Saving metadata to Firestore...');
                        const docRef = await addDoc(collection(db, 'files'), {
                            userId: user.uid,
                            fileName: file.name,
                            encryptedFileName: encryptedFile.name,
                            storagePath: storageRef.fullPath,
                            downloadURL: downloadURL,
                            size: file.size,
                            type: file.type,
                            uploadedAt: new Date().toISOString()
                        });
                        console.log('uploadFile - Metadata saved with ID:', docRef.id);

                        resolve({ 
                            success: true, 
                            downloadURL: downloadURL,
                            fileName: file.name 
                        });
                    } catch (error) {
                        console.error('uploadFile - Error in completion handler:', error);
                        reject({ success: false, error: error.message });
                    }
                }
            );
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get all files for current user
export async function getUserFiles() {
    const user = getCurrentUser();
    console.log('getUserFiles - Current user:', user);
    
    if (!user) {
        console.error('getUserFiles - No user authenticated');
        return { success: false, error: 'User not authenticated' };
    }

    try {
        console.log('getUserFiles - Querying Firestore for ALL files');
        const q = query(collection(db, 'files'));
        const querySnapshot = await getDocs(q);
        console.log('getUserFiles - Query completed, docs count:', querySnapshot.size);
        const files = [];
        querySnapshot.forEach((doc) => {
            const fileData = {
                id: doc.id,
                ...doc.data()
            };
            console.log('getUserFiles - File found:', fileData);
            files.push(fileData);
        });
        files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        console.log('getUserFiles - Total files:', files.length);
        return { success: true, files };
    } catch (error) {
        console.error('getUserFiles - Error:', error);
        return { success: false, error: error.message };
    }
}

// Delete file from storage and database
export async function deleteFile(fileId, storagePath) {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, error: 'User not authenticated' };
    }

    try {
        // Delete from Storage
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);

    // Delete from Firestore
    await deleteDoc(doc(db, 'files', fileId));

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Download file
export function downloadFile(url, fileName) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
