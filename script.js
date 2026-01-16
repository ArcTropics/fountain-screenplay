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
