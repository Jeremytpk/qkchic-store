import { onAuthChange, signIn, getCurrentUser } from './auth.js';
import { getUserFiles } from './storage.js';
import { downloadDecryptedFile } from './encryption.js';

// Check if user is authenticated
onAuthChange((user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
});

// DOM Elements
// Upload section elements for view.html
const viewFileInput = document.getElementById('viewFileInput');
const viewUploadBtn = document.getElementById('viewUploadBtn');
const viewFileCount = document.getElementById('viewFileCount');
const viewUploadProgress = document.getElementById('viewUploadProgress');
import { uploadFile } from './storage.js';
const verifySection = document.getElementById('verifySection');
const filesViewSection = document.getElementById('filesViewSection');
const verifyPassword = document.getElementById('verifyPassword');
const verifyBtn = document.getElementById('verifyBtn');
const backBtn = document.getElementById('backBtn');
const userEmailSpan = document.getElementById('userEmail');
const backToMainBtn = document.getElementById('backToMainBtn');

// Selection elements
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
const selectedCountSpan = document.getElementById('selectedCount');

// File groups
const imagesGroup = document.getElementById('imagesGroup');
const videosGroup = document.getElementById('videosGroup');
const documentsGroup = document.getElementById('documentsGroup');
const othersGroup = document.getElementById('othersGroup');
const emptyState = document.getElementById('emptyState');

const imagesList = document.getElementById('imagesList');
const videosList = document.getElementById('videosList');
const documentsList = document.getElementById('documentsList');
const othersList = document.getElementById('othersList');

let userPassword = '';
let allFiles = [];
let selectedFiles = new Set();

// Show selected file count for view upload
if (viewFileInput) {
    viewFileInput.addEventListener('change', () => {
        const count = viewFileInput.files.length;
        if (count > 0) {
            viewFileCount.textContent = `${count} fichier${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
        } else {
            viewFileCount.textContent = '';
        }
    });
}

// Upload files from view.html
if (viewUploadBtn) {
    viewUploadBtn.addEventListener('click', async () => {
        const files = viewFileInput.files;
        if (files.length === 0) {
            alert('Veuillez sélectionner au moins un fichier');
            return;
        }
        // No password required for upload
        viewUploadBtn.disabled = true;
        viewUploadProgress.textContent = 'Téléchargement en cours...';
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            viewUploadProgress.textContent = `Téléchargement de ${file.name} (${i + 1}/${files.length})...`;
            const result = await uploadFile(file, undefined, (progress) => {
                viewUploadProgress.textContent = `Téléchargement de ${file.name}: ${Math.round(progress)}%`;
            });
            if (!result.success) {
                alert(`Échec du téléchargement de ${file.name}: ${result.error}`);
            }
        }
        viewUploadProgress.textContent = 'Téléchargement terminé !';
        viewFileInput.value = '';
        viewFileCount.textContent = '';
        viewUploadBtn.disabled = false;
        setTimeout(() => {
            viewUploadProgress.textContent = '';
        }, 3000);
        await loadAndDisplayFiles();
    });
}

// Verify password
verifyBtn.addEventListener('click', async () => {
    const password = verifyPassword.value;
    
    if (!password) {
        alert('Veuillez entrer votre mot de passe');
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Vérification...';

    const user = getCurrentUser();
    const result = await signIn(user.email, password);

    if (result.success) {
        userPassword = password;
        verifySection.style.display = 'none';
        filesViewSection.style.display = 'block';
        userEmailSpan.textContent = user.email;
        await loadAndDisplayFiles();
    } else {
        alert('Mot de passe incorrect');
    }

    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Vérifier';
    verifyPassword.value = '';
});

// Back to main
backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

backToMainBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Enter key support
verifyPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') verifyBtn.click();
});

// Load and display files grouped by type
async function loadAndDisplayFiles() {
    console.log('Loading files...');
    
    try {
        const result = await getUserFiles();
        console.log('Files result:', result);

        if (!result.success) {
            console.error('Error loading files:', result.error);
            emptyState.innerHTML = `<p style="color: red;">Erreur de chargement des fichiers : ${result.error}</p><p>Vérifiez que Firestore est activé dans la console Firebase.</p>`;
            emptyState.style.display = 'block';
            return;
        }

        allFiles = result.files;
        console.log('Total files:', allFiles.length);
        console.log('Files array:', allFiles);

        if (allFiles.length === 0) {
            let debugHtml = '<p>Aucun fichier trouvé</p><p>Téléchargez des fichiers depuis la page principale.</p>';
            debugHtml += '<pre style="background:#eee;padding:10px;max-width:100%;overflow:auto;">' + JSON.stringify(result.files, null, 2) + '</pre>';
            emptyState.innerHTML = debugHtml;
            emptyState.style.display = 'block';
            console.log('No files found');
            return;
        }

        // Debug: afficher tous les fichiers récupérés
        let debugHtml = '<pre style="background:#eee;padding:10px;max-width:100%;overflow:auto;">' + JSON.stringify(allFiles, null, 2) + '</pre>';
        emptyState.innerHTML = debugHtml;
        emptyState.style.display = 'block';

        emptyState.style.display = 'none';
    } catch (error) {
        console.error('Exception in loadAndDisplayFiles:', error);
        emptyState.innerHTML = `<p style="color: red;">Erreur: ${error.message}</p>`;
        emptyState.style.display = 'block';
        return;
    }

    // Group files by type
    const images = [];
    const videos = [];
    const documents = [];
    const others = [];

    allFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
            images.push(file);
        } else if (file.type.startsWith('video/')) {
            videos.push(file);
        } else if (file.type.includes('pdf') || file.type.includes('document') || 
                   file.type.includes('text') || file.type.includes('sheet') ||
                   file.type.includes('word') || file.type.includes('excel')) {
            documents.push(file);
        } else {
            others.push(file);
        }
    });

    // Display each group
    if (images.length > 0) {
        imagesGroup.style.display = 'block';
        displayFiles(images, imagesList, true);
    }

    if (videos.length > 0) {
        videosGroup.style.display = 'block';
        displayFiles(videos, videosList, false);
    }

    if (documents.length > 0) {
        documentsGroup.style.display = 'block';
        displayFiles(documents, documentsList, false);
    }

    if (others.length > 0) {
        othersGroup.style.display = 'block';
        displayFiles(others, othersList, false);
    }
}

// Display files in a container
function displayFiles(files, container, showPreview) {
    container.innerHTML = '';

    files.forEach(file => {
        const card = createFileCard(file, showPreview);
        container.appendChild(card);
    });
}

// Create file card
function createFileCard(file, showPreview) {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.dataset.fileId = file.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'file-checkbox';
    checkbox.addEventListener('change', () => handleFileSelection(file.id, checkbox.checked));

    let preview = '';
    if (showPreview && file.type.startsWith('image/') && file.downloadURL) {
        preview = `<div class="file-preview"><img src="${file.downloadURL}" alt="${file.fileName}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" /></div>`;
    } else {
        const icon = getFileIcon(file.type);
        preview = `<div class="file-preview"><div class="file-icon">${icon}</div></div>`;
    }

    const date = new Date(file.uploadedAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const sizeInKB = (file.size / 1024).toFixed(2);

    card.innerHTML = `
        ${preview}
        <div class="file-info">
            <div class="file-name">${file.fileName}</div>
            <div class="file-meta">${date} • ${sizeInKB} KB</div>
        </div>
        <button class="delete-file-btn" title="Supprimer" style="position:absolute;top:8px;right:8px;background:transparent;border:none;cursor:pointer;font-size:20px;color:#e53e3e;z-index:2;">
            <span aria-label="Supprimer">🗑️</span>
        </button>
    `;

    card.insertBefore(checkbox, card.firstChild);

    // Add delete event
    const deleteBtn = card.querySelector('.delete-file-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Supprimer le fichier "${file.fileName}" ?`)) {
            deleteFileById(file.id);
        }
    });

    return card;
}

// Get file icon based on type
function getFileIcon(type) {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.includes('pdf')) return '📕';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    if (type.includes('audio')) return '🎵';
    return '📄';
}

// Handle file selection
function handleFileSelection(fileId, isSelected) {
    const card = document.querySelector(`[data-file-id="${fileId}"]`);
    
    if (isSelected) {
        selectedFiles.add(fileId);
        card.classList.add('selected');
    } else {
        selectedFiles.delete(fileId);
        card.classList.remove('selected');
    }

    updateSelectionUI();
}

// Update selection UI
function updateSelectionUI() {
    const count = selectedFiles.size;
    selectedCountSpan.textContent = count;
    downloadSelectedBtn.disabled = count === 0;
}

// Select all files
selectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.file-checkbox').forEach(checkbox => {
        checkbox.checked = true;
        const fileId = checkbox.closest('.file-card').dataset.fileId;
        selectedFiles.add(fileId);
        checkbox.closest('.file-card').classList.add('selected');
    });
    updateSelectionUI();
});

// Deselect all files
deselectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.file-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('.file-card').classList.remove('selected');
    });
    selectedFiles.clear();
    updateSelectionUI();
});

// Download selected files
downloadSelectedBtn.addEventListener('click', async () => {
    if (selectedFiles.size === 0) return;

    downloadSelectedBtn.disabled = true;
    downloadSelectedBtn.textContent = 'Téléchargement...';

    let successCount = 0;
    let errorCount = 0;

    for (const fileId of selectedFiles) {
        const file = allFiles.find(f => f.id === fileId);
        if (file) {
            try {
                console.log('Attempting download:', {
                    fileId: file.id,
                    fileName: file.fileName,
                    encryptedFileName: file.encryptedFileName,
                    downloadURL: file.downloadURL,
                    type: file.type,
                    password: userPassword
                });
                const downloadName = file.encryptedFileName || file.fileName;
                await downloadDecryptedFile(file.downloadURL, downloadName, userPassword, file.type);
                console.log('Download success:', file.fileName);
                successCount++;
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error('Download error for file:', file.fileName, error);
                alert(`Erreur de téléchargement pour ${file.fileName}: ${error.message}`);
                errorCount++;
            }
        } else {
            console.error('File not found for ID:', fileId);
        }
    }

    if (errorCount > 0) {
        alert(`Téléchargement terminé avec des erreurs.\nRéussis: ${successCount}\nÉchecs: ${errorCount}`);
    } else {
        alert(`${successCount} fichier(s) téléchargé(s) avec succès !`);
    }

    downloadSelectedBtn.disabled = false;
    downloadSelectedBtn.textContent = `Télécharger la sélection (${selectedFiles.size})`;
});

// Delete file by ID
async function deleteFileById(fileId) {
    try {
        // Find file object
        const file = allFiles.find(f => f.id === fileId);
        if (!file) {
            alert('Fichier introuvable.');
            return;
        }
        // Remove from Firebase Storage
        // You must implement the actual deletion logic here, e.g. using Firebase SDK
        // Example:
        // await firebase.storage().refFromURL(file.downloadURL).delete();
        // Remove from UI
        allFiles.splice(allFiles.findIndex(f => f.id === fileId), 1);
        await loadAndDisplayFiles();
        alert(`Fichier supprimé: ${file.fileName}`);
    } catch (error) {
        console.error('Erreur de suppression:', error);
        alert('Erreur lors de la suppression du fichier.');
    }
}
