/*
* APPLICATION NAME: OpenDraft
* CREATOR: Vinimay Kaul
* COMPANY: Arctropics OÜ
* COPYRIGHT: MIT License
* PURPOSE: This JS file takes care of updates
*/

// stylesheet
const updateStyles = `
    .update-mask {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 9999; backdrop-filter: blur(4px);
    }
    .update-box {
        background: #222; border: 1px solid #0fa9e5; padding: 30px;
        border-radius: 12px; max-width: 400px; text-align: center;
        color: white; font-family: sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .update-box h2 { color: #0fa9e5; margin-top: 0; }
    .update-box p { color: #ccc; line-height: 1.5; }
    .update-box button {
        background: #0fa9e5; color: white; border: none; padding: 10px 20px;
        border-radius: 5px; cursor: pointer; font-weight: bold; margin: 10px;
    }
    .update-box button.secondary { background: transparent; border: 1px solid #555; }
    .update-box p {
        color: #ccc;
        line-height: 1.5;
        white-space: pre-line;
        text-align: left;
    }
`;

if (window.REJECTED_UPDATE) return;

async function checkForUpdates() {
    try {
        const response = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;

        const data = await response.json();
        const remoteVersion = data.version;
        const localVersion = window.APP_VERSION;

        if (isDifferentVersion(remoteVersion, localVersion)) {
            showUpdateDialog(remoteVersion, data.notes);
        }
    } catch (err) {
        console.log("Update check skipped (offline or network error).");
    }
}

function isDifferentVersion(remote, local) {
    // Trim whitespace to avoid false positives from accidental spaces
    const r = remote.trim();
    const l = local.trim();

    console.log(`Version Check: Server(${r}) | Current(${l})`);

    // Simple inequality check.
    // If they aren't identical, the user needs the new files.
    return r !== l;
}

function showUpdateDialog(newVer, notes) {
    // Create a simple, clean dialog
    const dialog = document.createElement('div');
    dialog.id = "update-dialog";
    dialog.innerHTML = `
        <div class="update-mask">
            <div class="update-box">
                <h2>New Update Available! (v${newVer})</h2>
                <p>${notes}</p>
                <button onclick="forceUpdate()">Update & Restart</button>
                <!-- <button onclick="this.parentElement.parentElement.remove()">Later</button> -->
                <button onclick="snoozeUpdate(this)">Later</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

// Function for snooze update
function snoozeUpdate(btn) {
    // Remove the dialog
    btn.parentElement.parentElement.remove();
    // Stop checking for updates for this specific session
    window.REJECTED_UPDATE = true;
}

// Function that is called when update is clicked.
async function forceUpdate() {
    // 1. Clear Service Worker caches
    if ('serviceWorker' in navigator) {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));

            // Unregister service workers to ensure the new one installs fresh
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
        } catch (e) { console.error("Cache clear failed", e); }
    }

    // 2. Force reload with cache-busting query string
    // This tells the browser: "This is a brand new URL, don't use old files"
    window.location.href = window.location.origin + window.location.pathname + '?update=' + Date.now();
}


// Add styles
const styleSheet = document.createElement("style");
styleSheet.innerText = updateStyles;
document.head.appendChild(styleSheet);

// Check for updates when the app loads
window.addEventListener('load', checkForUpdates);
// Also check if the user returns to the tab after a long time
window.addEventListener('focus', checkForUpdates);
