// --- DOM Elements ---
const editor = document.getElementById('editor');
const output = document.getElementById('output');
const container = document.querySelector('.container');
const titleDisplay = document.getElementById('currentActiveTitle');

// Nav & Toggle Buttons
const toggleNotesBtn = document.getElementById('toggleNotesBtn');
const togglePreviewBtn = document.getElementById('togglePreviewBtn');
const mobileToggle = document.getElementById('mobile-toggle');
const burgerBtn = document.getElementById('burger-btn');
const navMenu = document.getElementById('navMenu');

// Font Control Buttons (Restored)
const fontSizeDisplay = document.getElementById('fontSizeDisplay');
const increaseBtn = document.getElementById('increaseFont');
const decreaseBtn = document.getElementById('decreaseFont');

// File Operation Buttons (Restored)
const openBtn = document.getElementById('openBtn');
const saveBtn = document.getElementById('saveBtn');

// Library Sidebar
const librarySidebar = document.getElementById('librarySidebar');
const scriptListContainer = document.getElementById('scriptList');
const toggleLibraryBtn = document.getElementById('toggleLibraryBtn');
const closeLibraryBtn = document.getElementById('closeLibraryBtn');
const createNewBtn = document.getElementById('createNewBtn');

// ABout Dialogue
const aboutBtn = document.getElementById('aboutBtn');
const aboutDialog = document.getElementById('aboutDialog');
const closeAboutBtn = document.getElementById('closeAboutBtn');

// Initialize Fountain
const fountainInstance = new fountain();

let currentFontSize = 18;
let currentScriptTitle = null;

// For Syn-Scrolling
let isSyncingEditor = false;
let isSyncingPreview = false;

// --- 1. Library & Sidebar Logic ---

toggleLibraryBtn.addEventListener('click', () => {
    librarySidebar.classList.toggle('open');
    updateLibraryList();
});

closeLibraryBtn.addEventListener('click', () => {
    librarySidebar.classList.remove('open');
});

function updateLibraryList() {
    const scripts = JSON.parse(localStorage.getItem('fountain_library') || '{}');
    scriptListContainer.innerHTML = '';

    Object.keys(scripts).forEach(name => {
        const div = document.createElement('div');
        const isActive = (name === currentScriptTitle);
        div.className = `script-item ${isActive ? 'active' : ''}`;
        div.innerHTML = `<span>${name}</span><span class="delete-btn" onclick="event.stopPropagation(); deleteFromLibrary('${name}')">&times;</span>`;
        div.onclick = () => loadFromLibrary(name);
        scriptListContainer.appendChild(div);
    });
}

function loadFromLibrary(name) {
    const library = JSON.parse(localStorage.getItem('fountain_library') || '{}');
    currentScriptTitle = name;
    editor.value = library[name] || "";
    localStorage.setItem('last_active_script', name);
    render();
    updateLibraryList();
    librarySidebar.classList.remove('open');
}

function deleteFromLibrary(name) {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
        const scripts = JSON.parse(localStorage.getItem('fountain_library') || '{}');
        delete scripts[name];
        localStorage.setItem('fountain_library', JSON.stringify(scripts));
        if (currentScriptTitle === name) currentScriptTitle = null;
        updateLibraryList();
        render();
    }
}

createNewBtn.addEventListener('click', () => {
    const name = prompt("Enter a name for your new script:");
    if (name) {
        const library = JSON.parse(localStorage.getItem('fountain_library') || '{}');
        library[name] = "";
        localStorage.setItem('fountain_library', JSON.stringify(library));
        loadFromLibrary(name);
    }
});

// --- 2. Mobile & Responsive Logic ---

if (burgerBtn) {
    burgerBtn.addEventListener('click', () => navMenu.classList.toggle('active'));
}

if (mobileToggle) {
    mobileToggle.addEventListener('click', togglePreview);
}

// --- 3. Restored Font & File Operations ---

function updateFontSize(delta) {
    currentFontSize = Math.min(Math.max(currentFontSize + delta, 10), 40);
    editor.style.fontSize = `${currentFontSize}px`;
    if (fontSizeDisplay) fontSizeDisplay.innerText = `${currentFontSize}px`;
}

const fileOptions = {
    types: [
        {
            description: 'Fountain/Markdown Scripts',
            accept: {
                'text/plain': ['.fountain', '.fnt', '.md', '.txt'],
                'text/markdown': ['.md'],
                'application/octet-stream': ['.fountain'] // Helps some mobile browsers
            },
        },
    ],
    excludeAcceptAllOption: false, // Set to false to allow "All Files" on Android
};

async function openFile() {
    try {
        // Fallback for browsers/OS that don't support the modern Picker
        if (!window.showOpenFilePicker) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.fountain,.md,.txt,.fnt';
            input.onchange = e => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = event => {
                    editor.value = event.target.result;
                    render();
                };
                reader.readAsText(file);
            };
            input.click();
            return;
        }

        const [fileHandle] = await window.showOpenFilePicker(fileOptions);
        const file = await fileHandle.getFile();
        editor.value = await file.text();
        render();
    } catch (err) {
        console.error("Open cancelled or failed", err);
    }
}

async function saveFile() {
    try {
        const handle = await window.showSaveFilePicker(fileOptions);
        const writable = await handle.createWritable();
        await writable.write(editor.value);
        await writable.close();
    } catch (err) { console.error("Save cancelled", err); }
}

// --- 4. Restored Keyboard Shortcuts ---

window.addEventListener('keydown', (event) => {
    const isControl = event.ctrlKey || event.metaKey;
    if (isControl) {
        if (event.code === 'BracketLeft') { event.preventDefault(); updateFontSize(-2); }
        else if (event.code === 'BracketRight') { event.preventDefault(); updateFontSize(2); }

        switch (event.key.toLowerCase()) {
            case 's': event.preventDefault(); saveFile(); break;
            case 'o': event.preventDefault(); openFile(); break;
            case 'p': event.preventDefault(); window.print(); break;
            case 'm': event.preventDefault(); toggleNotes(); break;
            case ';': event.preventDefault(); togglePreview(); break;
        }
    }
});

// --- 5. Rendering & Notes ---

function render() {
    titleDisplay.innerText = currentScriptTitle ? `Editing: ${currentScriptTitle}` : "No script active";
    const rawText = editor.value;
    if (!rawText.trim()) {
        output.innerHTML = `<div style="text-align:center;color:#888;margin-top:100px;"><p>Script is empty.</p></div>`;
        return;
    }
    const parsedData = fountainInstance.parse(rawText);
    let htmlOutput = parsedData.html;
    const customNoteRegex = /\{\{([\s\S]*?)\}\}/g;
    htmlOutput = htmlOutput.replace(customNoteRegex, (m, t) => `<div class="note">${t.trim()}</div>`);
    output.innerHTML = htmlOutput;
}

// Toggle PREVIEW
// --- Unified Toggle Preview Logic ---
function togglePreview() {
    const isPreviewMode = container.classList.toggle('show-preview');

    // 1. Handle Mobile Toggle Button (Icon & Text)
    if (mobileToggle) {
        const icon = mobileToggle.querySelector('.material-symbols-outlined');
        const text = mobileToggle.querySelector('.toggle-text');

        if (isPreviewMode) {
            if (icon) icon.textContent = 'edit';
            if (text) text.textContent = 'Edit';
        } else {
            if (icon) icon.textContent = 'visibility';
            if (text) text.textContent = 'Preview';
        }
    }

    // 2. Always render when entering preview to ensure it's fresh
    if (isPreviewMode) {
        render();
    }
}

function toggleNotes() {
    output.classList.toggle('hide-notes');

    if (toggleNotesBtn) {
        const icon = toggleNotesBtn.querySelector('.material-symbols-outlined');
        const text = toggleNotesBtn.querySelector('span:not(.material-symbols-outlined)');

        if (output.classList.contains('hide-notes')) {
            if (icon) icon.textContent = 'description'; // Icon for "Notes are hidden"
            if (text) text.textContent = " Notes";
        } else {
            if (icon) icon.textContent = 'speaker_notes_off'; // Icon for "Hide Notes"
            if (text) text.textContent = " Notes";
        }
    }
}

editor.addEventListener('input', () => {
    if (currentScriptTitle) {
        const library = JSON.parse(localStorage.getItem('fountain_library') || '{}');
        library[currentScriptTitle] = editor.value;
        localStorage.setItem('fountain_library', JSON.stringify(library));
    }
    render();
});

// Open About Dialog
aboutBtn.addEventListener('click', () => {
    aboutDialog.showModal();
    // If on mobile, close the burger menu after clicking About
    if (navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
    }
});

// Close About Dialog via close Button
closeAboutBtn.addEventListener('click', () => {
    aboutDialog.close();
});

// Close via clicking anywhere else
aboutDialog.addEventListener('click', (event) => {
    const rect = aboutDialog.getBoundingClientRect();
    const isInDialog = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
        aboutDialog.close();
    }
});
/******************************/

/********   Sidebar Save collection *********/
// --- EXPORT ALL SCRIPTS ---
function exportAllScripts() {
    // 1. Get all data from localStorage
    const allData = JSON.stringify(localStorage, null, 4);

    // 2. Create a "Blob" (a virtual file)
    const blob = new Blob([allData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 3. Create a temporary download link and click it
    const date = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `fountain_backup_${date}.json`;
    document.body.appendChild(link);
    link.click();

    // 4. Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// --- IMPORT ALL SCRIPTS ---
function importAllScripts(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Confirm with user before overwriting
            if (confirm("This will overwrite your current scripts with the backup. Continue?")) {
                // Clear existing and set new
                localStorage.clear();
                for (let key in importedData) {
                    localStorage.setItem(key, importedData[key]);
                }
                alert("Restored successfully! The page will now reload.");
                window.location.reload(); // Refresh to show new scripts
            }
        } catch (err) {
            alert("Error: This doesn't look like a valid backup file.");
            console.error(err);
        }
    };
    reader.readAsText(file);
}

/**************************************/
  

// Scroll Editor -> Preview
const viewerPane = document.querySelector('.viewer-pane');

// Scroll Editor -> Preview
editor.addEventListener('scroll', () => {
    if (!isSyncingPreview && container.classList.contains('show-preview')) {
        isSyncingEditor = true;

        const editorScrollTop = editor.scrollTop;
        const editorMaxScroll = editor.scrollHeight - editor.clientHeight;
        const viewerMaxScroll = viewerPane.scrollHeight - viewerPane.clientHeight;

        // The Editor text for the title page is small (~5% of total text)
        const editorTitleThreshold = 0.03;
        const editorPercent = editorScrollTop / editorMaxScroll;

        let targetScroll;

        if (editorPercent < editorTitleThreshold) {
            // Because the editor is "slow", we map a tiny editor movement
            // to a large preview movement (0% - 25%)
            const zonePercent = editorPercent / editorTitleThreshold;
            targetScroll = (zonePercent * 0.25) * viewerMaxScroll;
        } else {
            // Normal sync for the rest of the script
            const zonePercent = (editorPercent - editorTitleThreshold) / (1 - editorTitleThreshold);
            targetScroll = (0.25 + zonePercent * 0.75) * viewerMaxScroll;
        }

        viewerPane.scrollTop = targetScroll;
        setTimeout(() => { isSyncingEditor = false; }, 50);
    }
});

// Scroll Preview -> Editor
viewerPane.addEventListener('scroll', () => {
    if (!isSyncingEditor && container.classList.contains('show-preview')) {
        isSyncingPreview = true;

        const viewerScrollTop = viewerPane.scrollTop;
        const viewerMaxScroll = viewerPane.scrollHeight - viewerPane.clientHeight;
        const editorMaxScroll = editor.scrollHeight - editor.clientHeight;

        // The Title Page is the first 25% of the Viewer (Page 1)
        const previewTitleThreshold = 0.25;
        const previewPercent = viewerScrollTop / viewerMaxScroll;

        let targetScroll;

        if (previewPercent < previewTitleThreshold) {
            // SLOW DOWN THE EDITOR:
            // Map the large 25% preview area to only 5% of the editor text
            const zonePercent = previewPercent / previewTitleThreshold;
            targetScroll = (zonePercent * 0.03) * editorMaxScroll;
        } else {
            // SYNCED: After the first page, scroll at normal 1:1 ratio
            const zonePercent = (previewPercent - previewTitleThreshold) / (1 - previewTitleThreshold);
            targetScroll = (0.05 + zonePercent * 0.95) * editorMaxScroll;
        }

        editor.scrollTop = targetScroll;
        setTimeout(() => { isSyncingPreview = false; }, 50);
    }
});

// --- 6. Initialization ---

window.addEventListener('DOMContentLoaded', () => {
    // 1. Add this line to make Preview active by default
    container.classList.add('show-preview');

    const library = JSON.parse(localStorage.getItem('fountain_library') || '{}');
    const lastActive = localStorage.getItem('last_active_script');

    if (Object.keys(library).length > 0) {
        loadFromLibrary(lastActive && library[lastActive] ? lastActive : Object.keys(library)[0]);
    } else {
        render();
    }

    // Ensure the mobile toggle button icon reflects the starting state
    if (mobileToggle) {
        const icon = mobileToggle.querySelector('.material-symbols-outlined');
        const text = mobileToggle.querySelector('.toggle-text');
        if (icon) icon.textContent = 'edit';
        if (text) text.textContent = 'Edit';
    }

    // Re-attach listeners
    if (increaseBtn) increaseBtn.onclick = () => updateFontSize(2);
    if (decreaseBtn) decreaseBtn.onclick = () => updateFontSize(-2);
    if (openBtn) openBtn.onclick = openFile;
    if (saveBtn) saveBtn.onclick = saveFile;
    if (toggleNotesBtn) toggleNotesBtn.onclick = toggleNotes;
});

render();
