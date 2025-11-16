import { onAuthChange, signUp, signIn, logout } from './auth.js';
import { uploadFile, getUserFiles, deleteFile, downloadFile } from './storage.js';

// DOM Elements
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const loginForm = document.querySelector('.auth-form');
const signupForm = document.getElementById('signupForm');

// Auth elements
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupBtn = document.getElementById('signupBtn');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailSpan = document.getElementById('userEmail');

// File elements
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadProgress = document.getElementById('uploadProgress');
const fileCount = document.getElementById('fileCount');

// Show selected file count
fileInput.addEventListener('change', () => {
    const count = fileInput.files.length;
    if (count > 0) {
        fileCount.textContent = `${count} fichier${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
    } else {
        fileCount.textContent = '';
    }
});

// Auth state observer
onAuthChange((user) => {
    if (user) {
        // User is signed in
        loginSection.style.display = 'none';
        appSection.style.display = 'block';
        userEmailSpan.textContent = user.email;
        
        // Attach view files button handler after app section is visible
        const viewFilesBtn = document.getElementById('viewFilesBtn');
        if (viewFilesBtn) {
            viewFilesBtn.addEventListener('click', () => {
                window.location.href = 'view.html';
            });
        }
    } else {
        // User is signed out
        loginSection.style.display = 'block';
        appSection.style.display = 'none';
    }
});

// Toggle between login and signup
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// Login
loginBtn.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        alert('Veuillez entrer votre e-mail et mot de passe');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Connexion en cours...';

    const result = await signIn(email, password);

    if (result.success) {
        loginEmail.value = '';
        loginPassword.value = '';
    } else {
        alert('Échec de la connexion : ' + result.error);
    }

    loginBtn.disabled = false;
    loginBtn.textContent = 'Se connecter';
});

// Signup
signupBtn.addEventListener('click', async () => {
    const email = signupEmail.value.trim();
    const password = signupPassword.value;

    if (!email || !password) {
        alert('Veuillez entrer votre e-mail et mot de passe');
        return;
    }

    if (password.length < 6) {
        alert('Le mot de passe doit contenir au moins 6 caractères');
        return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = 'Inscription en cours...';

    const result = await signUp(email, password);

    if (result.success) {
        signupEmail.value = '';
        signupPassword.value = '';
        alert('Compte créé avec succès !');
    } else {
        alert('Échec de l\'inscription : ' + result.error);
    }

    signupBtn.disabled = false;
    signupBtn.textContent = 'S\'inscrire';
});

// Logout
logoutBtn.addEventListener('click', async () => {
    const result = await logout();
    if (!result.success) {
        alert('Échec de la déconnexion : ' + result.error);
    }
});

// Upload files
uploadBtn.addEventListener('click', async () => {
    const files = fileInput.files;

    if (files.length === 0) {
        alert('Veuillez sélectionner au moins un fichier');
        return;
    }

    // Get user password for encryption
    const password = prompt('Entrez votre mot de passe pour chiffrer les fichiers:');
    if (!password) {
        alert('Mot de passe requis pour le chiffrement');
        return;
    }

    uploadBtn.disabled = true;
    uploadProgress.textContent = 'Téléchargement en cours...';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        uploadProgress.textContent = `Chiffrement et téléchargement de ${file.name} (${i + 1}/${files.length})...`;

        const result = await uploadFile(file, password, (progress) => {
            uploadProgress.textContent = `Téléchargement de ${file.name}: ${Math.round(progress)}%`;
        });

        if (!result.success) {
            alert(`Échec du téléchargement de ${file.name}: ${result.error}`);
        }
    }

    uploadProgress.textContent = 'Téléchargement terminé !';
    fileInput.value = '';
    fileCount.textContent = '';
    uploadBtn.disabled = false;
    
    setTimeout(() => {
        uploadProgress.textContent = '';
    }, 3000);
});

// Enable Enter key for login/signup
loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

signupPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') signupBtn.click();
});
