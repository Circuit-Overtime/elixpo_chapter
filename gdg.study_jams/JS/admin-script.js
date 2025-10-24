const ADMIN_PASSWORD = 'gdg@admin2025';

const API_BASE = window.location.origin + window.location.pathname.replace('admin.html', '');
const UPLOAD_API = API_BASE + 'upload.php';
const STATS_API = API_BASE + 'api.php';

const SESSION_KEY = 'gdg_admin_session';
const SESSION_DURATION = 3600000;

let loginForm, loginError, password;
let adminDashboard, logoutBtn;
let dropZone, fileInput, filePreview, uploadForm, uploadBtn;
let uploadSuccess, uploadError, errorMessage;
let currentFileName, lastModified, fileSize;
let downloadBackup, removeFileBtn;
let previewName, previewSize;

let selectedFile = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    checkSession();
    setupEventListeners();
    loadFileInfo();
});

function initializeElements() {
    loginForm = document.getElementById('loginForm');
    loginError = document.getElementById('loginError');
    password = document.getElementById('password');
    
    adminDashboard = document.getElementById('adminDashboard');
    logoutBtn = document.getElementById('logoutBtn');
    
    dropZone = document.getElementById('dropZone');
    fileInput = document.getElementById('fileInput');
    filePreview = document.getElementById('filePreview');
    uploadForm = document.getElementById('uploadForm');
    uploadBtn = document.getElementById('uploadBtn');
    removeFileBtn = document.getElementById('removeFile');
    
    uploadSuccess = document.getElementById('uploadSuccess');
    uploadError = document.getElementById('uploadError');
    errorMessage = document.getElementById('errorMessage');
    
    currentFileName = document.getElementById('currentFileName');
    lastModified = document.getElementById('lastModified');
    fileSize = document.getElementById('fileSize');
    
    previewName = document.getElementById('previewName');
    previewSize = document.getElementById('previewSize');
    
    downloadBackup = document.getElementById('downloadBackup');
}

function checkSession() {
    const session = localStorage.getItem(SESSION_KEY);
    
    if (session) {
        const sessionData = JSON.parse(session);
        const now = Date.now();
        
        if (now - sessionData.timestamp < SESSION_DURATION) {
            showDashboard();
            return;
        }
    }
    
    showLogin();
}

function createSession() {
    const sessionData = {
        timestamp: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

function destroySession() {
    localStorage.removeItem(SESSION_KEY);
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    adminDashboard.style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    adminDashboard.style.display = 'block';
    loadStatistics();
}

async function loadStatistics() {
    try {
        const response = await fetch(`${STATS_API}?action=stats`);
        const result = await response.json();
        
        if (!result.success) {
            console.error('Failed to load statistics:', result.message);
            return;
        }
        
        const stats = result.data;
        
        animateValue(document.getElementById('statTotal'), 0, stats.total, 1000);
        animateValue(document.getElementById('statCompleted'), 0, stats.completed, 1000);
        animateValue(document.getElementById('statInProgress'), 0, stats.inProgress, 1000);
        animateValue(document.getElementById('statRedeemed'), 0, stats.redeemed, 1000);
        
        document.getElementById('statCompletedPercent').textContent = stats.completedPercent + '%';
        document.getElementById('statInProgressPercent').textContent = stats.inProgressPercent + '%';
        document.getElementById('statRedeemedPercent').textContent = stats.redeemedPercent + '%';
        
        animateValue(document.getElementById('totalBadges'), 0, stats.badges.total, 1000);
        document.getElementById('avgBadges').textContent = stats.badges.average;
        document.getElementById('maxBadges').textContent = stats.badges.max;
        animateValue(document.getElementById('highBadges'), 0, stats.badges.highUsers, 1000);
        
        animateValue(document.getElementById('totalGames'), 0, stats.games.total, 1000);
        document.getElementById('avgGames').textContent = stats.games.average;
        document.getElementById('maxGames').textContent = stats.games.max;
        animateValue(document.getElementById('usersWithGames'), 0, stats.games.usersWithGames, 1000);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function animateValue(element, start, end, duration) {
    if (!element) return;
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // File input
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    uploadForm.addEventListener('submit', handleUpload);
    
    removeFileBtn.addEventListener('click', clearFileSelection);
    
    downloadBackup.addEventListener('click', handleDownloadBackup);
}

function handleLogin(e) {
    e.preventDefault();
    
    const enteredPassword = password.value;
    
    if (enteredPassword === ADMIN_PASSWORD) {
        createSession();
        showDashboard();
        password.value = '';
        loginError.style.display = 'none';
    } else {
        loginError.textContent = 'Incorrect password. Please try again.';
        loginError.style.display = 'block';
        password.value = '';
        password.focus();
    }
}

function handleLogout() {
    destroySession();
    showLogin();
    clearFileSelection();
    hideAlerts();
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

function validateAndSetFile(file) {
    hideAlerts();
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showError('Please select a valid CSV file.');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB.');
        return;
    }
    
    selectedFile = file;
    showFilePreview(file);
    uploadBtn.disabled = false;
}

function showFilePreview(file) {
    previewName.textContent = file.name;
    previewSize.textContent = formatFileSize(file.size);
    
    dropZone.style.display = 'none';
    filePreview.style.display = 'block';
}

function clearFileSelection() {
    selectedFile = null;
    fileInput.value = '';
    
    dropZone.style.display = 'flex';
    filePreview.style.display = 'none';
    uploadBtn.disabled = true;
    hideAlerts();
}

async function handleUpload(e) {
    e.preventDefault();
    
    if (!selectedFile) {
        showError('Please select a file first.');
        return;
    }
    
    hideAlerts();
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `
        <svg class="btn-icon" style="animation: spin 1s linear infinite;" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        </svg>
        Uploading...
    `;
    
    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('password', ADMIN_PASSWORD);
        
        const response = await fetch(`${UPLOAD_API}?action=upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        uploadBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Upload & Replace
        `;
        
        uploadSuccess.style.display = 'flex';
        clearFileSelection();
        loadFileInfo();
        loadStatistics();
        
        setTimeout(() => {
            uploadSuccess.style.display = 'none';
        }, 5000);
        
    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message || 'Failed to upload file. Please try again.');
        
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Upload & Replace
        `;
    }
}

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

function validateCSVContent(content) {
    const lines = content.trim().split('\n');
    
    if (lines.length < 2) {
        return false;
    }
    
    const header = lines[0].toLowerCase();
    const requiredColumns = ['user name', 'user email', 'profile url'];
    
    for (const col of requiredColumns) {
        if (!header.includes(col)) {
            return false;
        }
    }
    
    return true;
}

function saveCSVData(content) {
    const data = {
        content: content,
        timestamp: Date.now(),
        size: new Blob([content]).size
    };
    
    localStorage.setItem('gdg_csv_data', JSON.stringify(data));
}

async function loadFileInfo() {
    try {
        const response = await fetch(`${UPLOAD_API}?action=info`);
        const result = await response.json();
        
        if (result.success && result.data) {
            currentFileName.textContent = result.data.filename;
            lastModified.textContent = formatDate(result.data.modified * 1000);
            fileSize.textContent = formatFileSize(result.data.size);
        } else {
            currentFileName.textContent = 'data.csv';
            lastModified.textContent = 'Not available';
            fileSize.textContent = 'Not available';
        }
    } catch (error) {
        console.error('Error loading file info:', error);
        currentFileName.textContent = 'data.csv';
        lastModified.textContent = 'Error loading info';
        fileSize.textContent = 'Error loading info';
    }
}

function handleDownloadBackup() {
    window.location.href = `${UPLOAD_API}?action=download`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(message) {
    errorMessage.textContent = message;
    uploadError.style.display = 'flex';
}

function hideAlerts() {
    uploadSuccess.style.display = 'none';
    uploadError.style.display = 'none';
}

const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
