// Encryption and Decryption utilities using Web Crypto API

// Generate encryption key from password
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// Encrypt file
export async function encryptFile(file, password) {
    try {
        console.log('encryptFile - Starting encryption for:', file.name);
        
        // Read file as ArrayBuffer
        const fileBuffer = await file.arrayBuffer();
        console.log('encryptFile - File read, size:', fileBuffer.byteLength);
        
        // Generate random salt and IV
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        console.log('encryptFile - Salt and IV generated');
        
        // Derive encryption key from password
        const key = await deriveKey(password, salt);
        console.log('encryptFile - Encryption key derived');
        
        // Encrypt the file
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            fileBuffer
        );
        console.log('encryptFile - File encrypted, size:', encryptedData.byteLength);
        
        // Combine salt + iv + encrypted data
        const encryptedFile = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
        encryptedFile.set(salt, 0);
        encryptedFile.set(iv, salt.length);
        encryptedFile.set(new Uint8Array(encryptedData), salt.length + iv.length);
        
        // Create new File object with encrypted data
        const encryptedBlob = new Blob([encryptedFile], { type: 'application/octet-stream' });
        const result = new File([encryptedBlob], file.name + '.encrypted', { type: 'application/octet-stream' });
        console.log('encryptFile - Encryption complete');
        return result;
    } catch (error) {
        console.error('encryptFile - Encryption error:', error);
        throw new Error('Échec du chiffrement du fichier');
    }
}

// Decrypt file
export async function decryptFile(encryptedData, password, originalFileName) {
    try {
        // Extract salt, iv, and encrypted data
        const dataArray = new Uint8Array(encryptedData);
        const salt = dataArray.slice(0, 16);
        const iv = dataArray.slice(16, 28);
        const encrypted = dataArray.slice(28);
        
        // Derive decryption key from password
        const key = await deriveKey(password, salt);
        
        // Decrypt the data
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encrypted
        );
        
        return decryptedData;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Échec du déchiffrement du fichier. Mot de passe incorrect?');
    }
}

// Download decrypted file
export async function downloadDecryptedFile(url, fileName, password, fileType) {
    try {
        console.log('[downloadDecryptedFile] Start', { url, fileName, fileType });
        // Fetch file directly
        const response = await fetch(url);
        if (!response.ok) {
            console.error('[downloadDecryptedFile] Fetch failed', response.status, response.statusText);
            throw new Error('Failed to fetch file: ' + response.statusText);
        }
        const fileData = await response.arrayBuffer();
        console.log('[downloadDecryptedFile] File data size:', fileData.byteLength);
        // Remove .encrypted extension if present
        const originalFileName = fileName.replace('.encrypted', '');
        // Create blob and download
        const blob = new Blob([fileData], { type: fileType });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = originalFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        console.log('[downloadDecryptedFile] Download triggered for', originalFileName);
    } catch (error) {
        console.error('[downloadDecryptedFile] Error:', error);
        throw error;
    }
}
