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

// 3. The Action Gateway
// function handleCloudSave(provider) {
//     let dataToSave;
//     let fileName;
//
//     // Use specific targeting so we don't mess with the "About" dialog
//     const cloudModal = document.getElementById('cloud-modal');
//     const modalContent = cloudModal.querySelector('.modal-content');
//
//     if (exportType === 'current') {
//         const editor = document.getElementById('editor');
//         dataToSave = editor ? editor.value : "";
//         fileName = "script_export.txt";
//     } else {
//         dataToSave = JSON.stringify(localStorage, null, 2);
//         fileName = "collection_backup.json";
//     }
//
//     if (!dataToSave || dataToSave === "{}" || dataToSave === "") {
//         alert("Nothing to save!");
//         return;
//     }
//
//     // Save the original HTML to restore it later
//     const originalHTML = modalContent.innerHTML;
//
//     // Show loading state inside the CORRECT modal
//     modalContent.innerHTML = `
//         <div class="loading-state">
//             <div class="spinner"></div>
//             <p>Connecting to ${provider}...</p>
//         </div>
//     `;
//
//     setTimeout(() => {
//     // 1. Clear the loading state and show the Success Message
//     modalContent.innerHTML = `
//         <div class="success-state" style="padding: 20px; text-align: center;">
//             <span class="material-symbols-outlined" style="font-size: 48px; color: #4CAF50;">check_circle</span>
//             <p style="margin: 15px 0;">Successfully saved <strong>${fileName}</strong> to ${provider}!</p>
//             <button id="cloud-success-close" class="btn" style="width: 100%; margin-top: 10px;">Done</button>
//         </div>
//     `;
//
//     // 2. Attach the close event to the NEWly created button
//     const successBtn = document.getElementById('cloud-success-close');
//     if (successBtn) {
//         successBtn.onclick = () => {
//             closeCloudModal();
//
//             // 3. Optional: Reset the modal back to its original state after it closes
//             // so it's ready for the next time the user opens it.
//             setTimeout(() => {
//                 modalContent.innerHTML = originalHTML;
//                 attachCloudListeners();
//             }, 300);
//         };
//       }
//     }, 2000);
// }

// cloud.js

function handleCloudSave(provider) {
    const cloudModal = document.getElementById('cloud-modal');
    const modalContent = cloudModal.querySelector('.modal-content');

    if (!originalHTML) originalHTML = modalContent.innerHTML;

    // 1. Get current date/time in YYYYMMDDHHmm format
    const now = new Date();
    const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');

    // 2. Set default name based on export type
    const defaultName = exportType === 'current' ? `script_${timestamp}` : `collection_${timestamp}`;

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
    // Use the passed name or the one stored during auth popup
    const fileName = fileNameFromInput || window.pendingFileName || "untitled.txt";

    const cloudModal = document.getElementById('cloud-modal');
    const modalContent = cloudModal.querySelector('.modal-content');
    modalContent.innerHTML = `<div class="spinner"></div><p>Uploading ${fileName}...</p>`;

    const content = exportType === 'current' ?
                    document.getElementById('editor').value :
                    JSON.stringify(localStorage);

    try {
        const folderId = await getOrCreateFolder("My Screenplays");

        const metadata = {
            name: fileName,
            mimeType: exportType === 'current' ? 'text/plain' : 'application/json',
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([content], { type: metadata.mimeType }));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: form,
        });

        if (response.ok) {
            showSuccess(fileName, "Google Drive");
        } else {
            throw new Error('Upload failed');
        }
    } catch (err) {
        alert("Error: " + err.message);
        modalContent.innerHTML = originalHTML;
        attachCloudListeners();
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
