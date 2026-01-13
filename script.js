const editor = document.getElementById('editor');
const output = document.getElementById('output');
const toggleNotesBtn = document.getElementById('toggleNotesBtn');
const togglePreviewBtn = document.getElementById('togglePreviewBtn');
const container = document.querySelector('.container');
const fontSizeDisplay = document.getElementById('fontSizeDisplay');
const increaseBtn = document.getElementById('increaseFont');
const decreaseBtn = document.getElementById('decreaseFont');
const openBtn = document.getElementById('openBtn');
const saveBtn = document.getElementById('saveBtn');

const librarySidebar = document.getElementById('librarySidebar');
const scriptListContainer = document.getElementById('scriptList');
const toggleLibraryBtn = document.getElementById('toggleLibraryBtn');
const closeLibraryBtn = document.getElementById('closeLibraryBtn');
const createNewBtn = document.getElementById('createNewBtn');
const titleDisplay = document.getElementById('currentActiveTitle');

const fountainInstance = new fountain();

let currentFontSize = 18;
let currentScriptTitle = null;



// Logic to show hide left project BAR

toggleLibraryBtn.addEventListener('click', () => {
    librarySidebar.classList.toggle('open');
    updateLibraryList();
});

closeLibraryBtn.addEventListener('click', () => {
    librarySidebar.classList.remove('open');
});


// Logic to Save/Load ---
function updateLibraryList() {
    const scripts = JSON.parse(localStorage.getItem('fountain_library') || '{}');
    scriptListContainer.innerHTML = '';

    Object.keys(scripts).forEach(name => {
        const div = document.createElement('div');

        // Add an 'active' class if this is the script we are currently editing
        const isActive = (name === currentScriptTitle);
        div.className = `script-item ${isActive ? 'active' : ''}`;

        div.innerHTML = `<span>${name}</span>
            <span class="delete-btn" onclick="event.stopPropagation(); deleteFromLibrary('${name}')">&times;</span>`;

        div.onclick = () => loadFromLibrary(name);
        scriptListContainer.appendChild(div);
    });
}

// Load Script from Sidebar ---
function loadFromLibrary(name) {
    const library = JSON.parse(localStorage.getItem('fountain_library') || '{}');

    currentScriptTitle = name;
    editor.value = library[name] || "";

    // Save this name as the "Last Active" script
    localStorage.setItem('last_active_script', name);

    render();
    updateLibraryList(); // Refresh to show which one is active
    librarySidebar.classList.remove('open');
}

function deleteFromLibrary(name) {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
        const scripts = JSON.parse(localStorage.getItem('fountain_library') || '{}');
        delete scripts[name];
        localStorage.setItem('fountain_library', JSON.stringify(scripts));
        updateLibraryList();
    }
}

// Override the existing Save logic to make sure we also save to library
async function saveToLibrary() {
    const name = prompt("Enter a name for this script:", "Untitled Script");
    if (!name) return;

    const scripts = JSON.parse(localStorage.getItem('fountain_library') || '{}');
    scripts[name] = editor.value;
    localStorage.setItem('fountain_library', JSON.stringify(scripts));
    updateLibraryList();
}

// --- Create Function to create a new script ---
createNewBtn.addEventListener('click', () => {
    const name = prompt("Enter a name for your new script:");
    if (name) {
        const library = JSON.parse(localStorage.getItem('fountain_library') || '{}');
        library[name] = "";
        localStorage.setItem('fountain_library', JSON.stringify(library));

        currentScriptTitle = name;
        // NEW: Save this as the "Last Active" script immediately
        localStorage.setItem('last_active_script', name);

        editor.value = "";
        render();
        updateLibraryList();
        librarySidebar.classList.remove('open');
    }
});


/**********************************************/

// --- 1. RENDER LOGIC ---
function render() {
    //  Update the title display
    titleDisplay.innerText = currentScriptTitle ? `Editing: ${currentScriptTitle}` : "No script active";

    // Get the raw text from the editor
    const rawText = editor.value; // removed .trim() here so we don't lose leading spaces needed for Fountain

    // If the editor is empty, show the placeholder and stop
    if (!rawText.trim()) {
        const outputDisplay = document.getElementById('output'); // Make sure we have the display element
        outputDisplay.innerHTML = `
            <div style="text-align: center; color: #888; margin-top: 100px;">
                <span class="material-symbols-outlined" style="font-size: 48px; display: block; margin-bottom: 10px;">edit_note</span>
                <p>It seems like your script is empty. <br> Please type something to view the preview.</p>
            </div>`;
        return;
    }

    // Run the parser (saving the result into 'parsedData')
    const parsedData = fountainInstance.parse(rawText);

    // parsedData to html
    let htmlOutput = parsedData.html;

    // Apply the custom {{ note }} logic
    // (Note: The new fountain.js handles [[ notes ]], but this keeps my custom {{ }} working too!)
    const customNoteRegex = /\{\{([\s\S]*?)\}\}/g;
    htmlOutput = htmlOutput.replace(customNoteRegex, function(match, noteText) {
        return '<div class="note">' + noteText.trim() + '</div>';
    });

    // Update the actual screen
    const outputDisplay = document.getElementById('output');
    outputDisplay.innerHTML = htmlOutput;
}
// ENd of Render



// TOGGLE NOTES
function toggleNotes() {
    // Toggle the class on the output div
    output.classList.toggle('hide-notes');

    // Update the button text based on the presence of the class
    if (output.classList.contains('hide-notes')) {
        toggleNotesBtn.innerText = "Show Notes";
    } else {
        toggleNotesBtn.innerText = "Hide Notes";
    }
}

// sHow Hide Preveiw
function togglePreview() {
    container.classList.toggle('show-preview');

    if (container.classList.contains('show-preview')) {
        togglePreviewBtn.innerText = "Hide Preview";
    } else {
        togglePreviewBtn.innerText = "Show Preview";
    }
}

// Font Size Change Logic ---
function updateFontSize(delta) {
    currentFontSize = Math.min(Math.max(currentFontSize + delta, 10), 40);
    editor.style.fontSize = `${currentFontSize}px`;
    fontSizeDisplay.innerText = `${currentFontSize}px`;
}

// File Operations logic
const fileOptions = {
    types: [{
        description: 'Fountain Script',
        accept: { 'text/plain': ['.fountain', '.fnt', '.txt', '.md'] },
    }],
};

async function openFile() {
    try {
        const [fileHandle] = await window.showOpenFilePicker(fileOptions);
        const file = await fileHandle.getFile();
        const contents = await file.text();
        editor.value = contents;
        render();
    } catch (err) { console.error("Open cancelled", err); }
}

async function saveFile() {
    try {
        const handle = await window.showSaveFilePicker(fileOptions);
        const writable = await handle.createWritable();
        await writable.write(editor.value);
        await writable.close();
    } catch (err) { console.error("Save cancelled", err); }
}

// Function to save a script with a specific name
function saveToBrowser(scriptName) {
    const scripts = JSON.parse(localStorage.getItem('my_scripts') || '{}');

    scripts[scriptName] = {
        content: editor.value,
        lastModified: new Date().toISOString()
    };

    localStorage.setItem('my_scripts', JSON.stringify(scripts));
    alert(`Script "${scriptName}" saved to browser!`);
}

// Function to load a list of all saved scripts
function getSavedScripts() {
    return JSON.parse(localStorage.getItem('my_scripts') || '{}');
}

// Keyboard shortcuts implmentations
window.addEventListener('keydown', function(event) {
    const isControl = event.ctrlKey || event.metaKey;

    if (isControl) {
        // Handle Brackets separately via code for layout consistency
        if (event.code === 'BracketLeft') {
            event.preventDefault();
            updateFontSize(-2);
        } else if (event.code === 'BracketRight') {
            event.preventDefault();
            updateFontSize(2);
        }

        // Standard Keys
        switch (event.key.toLowerCase()) {
            case 's':
                event.preventDefault();
                saveFile();
                break;
            case 'o':
                event.preventDefault();
                openFile();
                break;
            case 'n':
                event.preventDefault();
                toggleNotes();
                break;
            case ';':
                event.preventDefault();
                togglePreview();
                break;
            case 'p':
                event.preventDefault();
                window.print();
                break;
            case 'm':
                event.preventDefault();
                toggleNotes();
                break;
        }
    }
});

// Adding event listeners
editor.addEventListener('input', () => {
    if (currentScriptTitle) {
        const library = JSON.parse(localStorage.getItem('fountain_library') || '{}');
        library[currentScriptTitle] = editor.value;
        localStorage.setItem('fountain_library', JSON.stringify(library));
    }
    render();
});

window.addEventListener('DOMContentLoaded', () => {
    const library = JSON.parse(localStorage.getItem('fountain_library') || '{}');
    const lastActive = localStorage.getItem('last_active_script');
    const keys = Object.keys(library);

    if (keys.length > 0) {
        // 1. Try to load the script you were last editing
        if (lastActive && library[lastActive] !== undefined) {
            loadFromLibrary(lastActive);
        } else {
            // 2. If that fails, just load the first one available
            loadFromLibrary(keys[0]);
        }
    } else {
        render(); // Show the "Empty" message if no scripts exist
    }
});

toggleNotesBtn.addEventListener('click', toggleNotes);
togglePreviewBtn.addEventListener('click', togglePreview);
increaseBtn.addEventListener('click', () => updateFontSize(2));
decreaseBtn.addEventListener('click', () => updateFontSize(-2));
openBtn.addEventListener('click', openFile);
saveBtn.addEventListener('click', saveFile);

// Call render to begin.
render();
