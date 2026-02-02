// cloud.js

const CLIENT_ID = '460779638387-mqjririlsl3s420lv1rhrd70odd80l3c.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let accessToken = null;
let originalHTML = "";


function openCloudModal() {
    const modal = document.getElementById('cloud-modal');
    if (modal) modal.style.display = 'flex';
}

function closeCloudModal() {
    const modal = document.getElementById('cloud-modal');
    if (modal) modal.style.display = 'none';
}

// 1. Logic for choosing WHAT to export
let exportType = 'current'; // Default

document.addEventListener('DOMContentLoaded', () => {
    const btnCurrent = document.getElementById('btn-export-current');
    const btnCollection = document.getElementById('btn-export-collection');

    if (btnCurrent && btnCollection) {
        btnCurrent.addEventListener('click', () => {
            exportType = 'current';
            btnCurrent.style.borderColor = '#007bff';
            btnCollection.style.borderColor = '#444';
            console.log("Selected: Current Script");
        });

        btnCollection.addEventListener('click', () => {
            exportType = 'collection';
            btnCollection.style.borderColor = '#007bff';
            btnCurrent.style.borderColor = '#444';
            console.log("Selected: Entire Collection");
        });
    }

    // 2. Logic for choosing WHERE to save
    const providerButtons = document.querySelectorAll('.provider-btn');
    providerButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const provider = e.target.innerText;
            handleCloudSave(provider);
        });
    });
});


unction handleCloudSave(provider) {
    const cloudModal = document.getElementById('cloud-modal');
    const modalContent = cloudModal.querySelector('.modal-content');

    if (!originalHTML) originalHTML = modalContent.innerHTML;

    const now = new Date();
    const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');

    // Use currentScriptTitle if it exists, otherwise fallback to "script"
    const baseName = (exportType === 'current' && window.currentScriptTitle)
                     ? window.currentScriptTitle.replace(/\s+/g, '_')
                     : (exportType === 'current' ? 'script' : 'full_collection');

    const defaultName = `${baseName}_${timestamp}`;

    // 3. Update UI to ask for filename
    modalContent.innerHTML = `
        <h3>Name your file</h3>
        <input type="text" id="cloud-filename" value="${defaultName}"
               style="width: 100%; padding: 10px; margin: 15px 0; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
        <div style="display: flex; gap: 10px;">
            <button id="confirm-upload" class="btn" style="flex: 1;">Upload</button>
            <button id="cancel-upload" class="btn" style="flex: 1; background: #555;">Back</button>
        </div>
    `;

    // 4. Handle confirmation
    document.getElementById('confirm-upload').onclick = () => {
        const chosenName = document.getElementById('cloud-filename').value || defaultName;
        const extension = exportType === 'current' ? '.txt' : '.json';
        const finalFileName = chosenName.endsWith(extension) ? chosenName : chosenName + extension;

        if (provider.toLowerCase() === 'google drive') {
            if (!accessToken) {
                tokenClient.requestAccessToken();
                // Note: The executeUpload call will need the finalFileName
                window.pendingFileName = finalFileName;
            } else {
                executeUpload(finalFileName);
            }
        }
    };

    document.getElementById('cancel-upload').onclick = () => {
        modalContent.innerHTML = originalHTML;
        attachCloudListeners();
    };
}


// Google Drive save
// Initialize Google Identity Services
function initGoogleDrive() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            accessToken = tokenResponse.access_token;
            if (accessToken) {
                executeUpload(window.pendingFileName); // Use the global temp name
            }
        },
    });
}

async function executeUpload(fileNameFromInput) {
    const fileName = fileNameFromInput || window.pendingFileName || "untitled.txt";
    const cloudModal = document.getElementById('cloud-modal');
    const modalContent = cloudModal.querySelector('.modal-content');

    modalContent.innerHTML = `<div class="spinner"></div><p>Uploading ${fileName}...</p>`;

    // --- DATA PREPARATION ---
    let content;
    let mimeType;

    if (exportType === 'current') {
        // Save just the text currently in the editor
        content = document.getElementById('editor').value;
        mimeType = 'text/plain';
    } else {
        // Save the structured library (Projects + Drafts)
        const libraryData = localStorage.getItem('fountain_library') || '{}';
        content = libraryData;
        mimeType = 'application/json';
    }

    try {
        const folderId = await getOrCreateFolder("My Screenplays");

        const metadata = {
            name: fileName,
            mimeType: mimeType,
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([content], { type: mimeType }));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: form,
        });

        if (response.ok) {
            showSuccess(fileName, "Google Drive");
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Upload failed');
        }
    } catch (err) {
        alert("Cloud Error: " + err.message);
        modalContent.innerHTML = originalHTML;
        if (window.attachCloudListeners) attachCloudListeners();
    }
}

// Helper function to handle the folder logic
async function getOrCreateFolder(folderName) {
    const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);

    // Check if exists
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();

    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }

    // If not, create it
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    const folder = await createRes.json();
    return folder.id;
}

function showSuccess(fileName, provider) {
    const cloudModal = document.getElementById('cloud-modal');
    const modalContent = cloudModal.querySelector('.modal-content');

    modalContent.innerHTML = `
        <div class="success-state">
            <span class="material-symbols-outlined" style="font-size: 48px; color: #4CAF50;">check_circle</span>
            <p>Successfully saved <strong>${fileName}</strong> to ${provider}!</p>
            <button id="cloud-success-close" class="btn">Done</button>
        </div>
    `;

    document.getElementById('cloud-success-close').onclick = () => {
        closeCloudModal();
        // Reset for next time
        setTimeout(() => {
            modalContent.innerHTML = originalHTML; // Make sure originalHTML is defined globally
            attachCloudListeners();
        }, 300);
    };
}
