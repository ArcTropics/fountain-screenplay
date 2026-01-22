/*
* APPLICATION NAME: OpenDraft
* CREATOR: Vinimay Kaul
* COMPANY: Arctropics OÜ
* COPYRIGHT: MIT License
* PURPOSE: This is the main editor's javascript file
*/


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

// Outline right bar
const outlineSidebar = document.getElementById('outlineSidebar');
const closeOutlineBtn = document.getElementById('closeOutlineBtn');

const syncToggleBtn = document.getElementById('syncScrollToggle');

// Initialize Fountain
const fountainInstance = new fountain();

let currentFontSize = 18;
let currentScriptTitle = null;

// For Syn-Scrolling
// let isSyncingEditor = false;
// let isSyncingPreview = false;
// let isSyncScrollEnabled = true; // Global toggle state
// let isInternalScroll = false;

let isJumping = false;
let targetLineForScroll = null;

//Library & Sidebar Logic ---

function toggleLibrary(){
  librarySidebar.classList.toggle('open');
  updateLibraryList();
}

toggleLibraryBtn.addEventListener('click', () => {
    toggleLibrary();
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

    // Updates the browser tab to "Script Name | OpenDraft"
    document.title = `${name} | OpenDraft`;

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

// --- Mobile & Responsive Logic ---

if (burgerBtn) {
    burgerBtn.addEventListener('click', () => navMenu.classList.toggle('active'));
}

if (mobileToggle) {
    mobileToggle.addEventListener('click', togglePreview);
}

// ---  Restored Font & File Operations ---

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

// ---  Keyboard Shortcuts ---

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
            case ',': event.preventDefault(); toggleLibrary(); break;
            case '.': event.preventDefault(); toggleOutline(); break;
        }
    }
});

// --- Rendering & Notes ---

function render() {
    titleDisplay.innerText = currentScriptTitle ? `Editing: ${currentScriptTitle}` : "No script active";
    const rawText = editor.value;

    if (!rawText.trim()) {
        output.innerHTML = `<div style="text-align:center;color:#888;margin-top:100px;"><p>Script is empty.</p></div>`;
        renderOutline([]);
        return;
    }
    const parsedData = fountainInstance.parse(rawText);

    const lines = rawText.split('\n').length; // calculate lines
    const estimatedPages = Math.max(1, Math.ceil(lines / 50)) + 1;

    const pageStatsElement = document.getElementById('page-count-display');
    if (pageStatsElement) {
        // pageStatsElement.innerText = `Approx. ${estimatedPages} Page${estimatedPages > 1 ? 's' : ''}`;
        pageStatsElement.innerText = `~${estimatedPages} Page${estimatedPages > 1 ? 's' : ''} (~${estimatedPages} min)`;
    }

    // NEW: Update Outline and Page Stats
    renderOutline(parsedData.outline);

    const pageStats = document.getElementById('page-stats');
    if (pageStats) {
        pageStats.innerText = `${estimatedPages} Page${estimatedPages > 1 ? 's' : ''} (~${estimatedPages} min)`;
    }

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

// Toggle outline Sidebar
function toggleOutline() {
    outlineSidebar.classList.toggle('open');
}

closeOutlineBtn.addEventListener('click', toggleOutline);

editor.addEventListener('input', () => {
    updateGutter();
    scene_search();
    render(); // This updates the UI
    autoSave(); // This writes to LocalStorage

    const lineNumbersDiv = document.getElementById('line-numbers');
    lineNumbersDiv.scrollTop = editor.scrollTop;
});

function autoSave() {
    if (!currentScriptTitle) return;

    const titleEl = document.getElementById('currentActiveTitle');

    // 1. Mark as "Dirty" (Unsaved) - Tiny Gray Tick
    if (titleEl) {
        titleEl.innerHTML = `Editing: ${currentScriptTitle} <span class="material-symbols-outlined" style="font-size: 18px; color: #888; vertical-align: middle; margin-left: 5px; font-weight: 700;">check</span>`;
    }

    // 2. Perform the actual Save
    const library = JSON.parse(localStorage.getItem('fountain_library') || '{}');
    library[currentScriptTitle] = editor.value;
    localStorage.setItem('fountain_library', JSON.stringify(library));

    // 3. Mark as "Clean" (Saved) - Green Tick
    setTimeout(() => {
        if (titleEl) {
            titleEl.innerHTML = `Editing: ${currentScriptTitle} <span class="material-symbols-outlined" style="font-size: 18px; color: #4CAF50; vertical-align: middle; margin-left: 5px; font-weight: 700;">check</span>`;
        }
    }, 1000);
}

//Sync And  Center Text area
function syncAndCenter(lineNumber) {
    if (lineNumber === undefined || lineNumber === null) return;

    // 1. Get exact measurements from the editor
    const style = window.getComputedStyle(editor);
    const lineHeight = parseFloat(style.lineHeight) || 27;
    const editorHeight = editor.clientHeight;

    // 2. Select the text
    const lines = editor.value.split('\n');
    let charPos = 0;
    for (let i = 0; i < lineNumber; i++) {
        charPos += lines[i].length + 1;
    }

    editor.focus();
    const lineLength = lines[lineNumber] ? lines[lineNumber].length : 0;
    editor.setSelectionRange(charPos, charPos + lineLength);

    // 3. Perform the scroll math (Same as your click logic)
    // Target = (Top of Line) - (Half of Editor) + (Half of Line Height)
    const scrollTarget = (lineNumber * lineHeight) - (editorHeight / 2) + (lineHeight / 2);

    editor.scrollTo({
        top: scrollTarget,
        behavior: 'smooth'
    });
}

// Output syncing scrolls
function syncOutputToLine(lineNum) {
    // 1. Find the element in the Output/Preview that has this line number
    const targetElement = output.querySelector(`[data-line="${lineNum}"]`);

    if (targetElement) {
        // 2. Scroll the Preview window to this element
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center' // Puts the element in the vertical middle of the preview
        });

        // 3. Add a "Pulse" highlight effect
        output.querySelectorAll('.sync-highlight').forEach(el => el.classList.remove('sync-highlight'));
        targetElement.classList.add('sync-highlight');

        //  Remove the highlight after 2 seconds
        // setTimeout(() => {
        //     targetElement.classList.remove('sync-highlight');
        // }, 2000);
        // commented becasue I don't want it to be unhighlihghted automatically.
    }
}

// Scroll to the selection places
function scrollToSelection() {
    const textBeforeCursor = editor.value.substring(0, editor.selectionStart);
    const lineIndex = textBeforeCursor.split('\n').length - 1;

    // 1. Get the actual spacing from your CSS
    const style = window.getComputedStyle(editor);
    const lineHeight = parseFloat(style.lineHeight);

    // 2. Calculate the pixel position of that line
    const scrollTarget = lineIndex * lineHeight;

    // 3. Scroll and Center it
    // We subtract half the editor's height to put the line in the middle
    editor.scrollTo({
        top: scrollTarget - (editor.clientHeight / 2) + (lineHeight / 2),
        behavior: 'smooth'
    });
}

function renderOutline(outline) {
    const list = document.getElementById('outlineList');
    list.innerHTML = ''; // Clear previous

    outline.forEach(item => {
        const div = document.createElement('div');
        div.className = 'outline-item';
        div.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px">movie</span> ${item.title}`;

        // attach listener to outlines
        div.onclick = () => {
            console.log("Outline Item Clicked! Target Line:", item.line);
            isJumping = true;
            targetLineForScroll = item.line;

            selectTextByLine(item.line);
        };
        // Jump to line on click
        // div.onclick = () => {
        //     // 1. Move the cursor to the scene line (already working)
        //     const lines = editor.value.split('\n');
        //     let charPos = 0;
        //     for(let i = 0; i < item.line; i++) {
        //         charPos += lines[i].length + 1;
        //     }
        //     editor.focus();
        //     editor.setSelectionRange(charPos, charPos);
        //
        //     // 2. ENHANCED MATH: Use getLineTop for pixel-perfect position
        //     const exactTop = getLineTop(item.line);
        //
        //     // 3. CENTER THE EDITOR
        //     // We take the exact pixel top and subtract half the viewport height
        //     const centerOffset = (editor.clientHeight / 2);
        //     const finalScrollTarget = exactTop - centerOffset;
        //
        //     editor.scrollTo({
        //         top: finalScrollTarget,
        //         behavior: 'smooth'
        //     });
        //
        //     // 4. Sync the 5px gutter (since it's a separate scrollable div)
        //     const lineNumbersDiv = document.getElementById('line-numbers');
        //     if (lineNumbersDiv) {
        //         lineNumbersDiv.scrollTop = finalScrollTarget;
        //     }
        //
        //     if (window.innerWidth < 1024) toggleOutline();
        // };




        list.appendChild(div);
    });
}


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

/************* Sidebar Right . Outline **********/
function jumpToScene(lineNumber) {
    const style = window.getComputedStyle(editor);
    const lh = parseFloat(style.lineHeight) || 24;

    // Move Cursor
    const lines = editor.value.split('\n');
    let charIndex = 0;
    for (let i = 0; i < lineNumber; i++) {
        charIndex += lines[i].length + 1;
    }
    editor.focus();
    editor.setSelectionRange(charIndex, charIndex);

    // Center Scroll
    const sceneTop = getLineTop(lineNumber);
    const centerOffset = (editor.clientHeight / 2) - (lh / 2);
    const finalScroll = sceneTop - centerOffset;

    editor.scrollTo({ top: finalScroll, behavior: 'smooth' });

    const lineNumbersDiv = document.getElementById('line-numbers');
    if (lineNumbersDiv) lineNumbersDiv.scrollTop = finalScroll;
}

// Function to move the editor and center the view
function jumpToLine(lineIndex) {
    if (lineIndex === undefined || lineIndex === null) return;

    const lines = editor.value.split('\n');
    let charPos = 0;
    for (let i = 0; i < lineIndex; i++) {
        charPos += lines[i].length + 1;
    }

    // Open the gate so the listener knows to center this
    isJumping = true;

    editor.focus();
    const lineLength = lines[lineIndex] ? lines[lineIndex].length : 0;
    editor.setSelectionRange(charPos, charPos + lineLength);

    // Close the gate after a short delay to allow the listener to finish
    setTimeout(() => { isJumping = false; }, 500);
}



function updateOutlineUI(outlineData) {
    const container = document.getElementById('outlineList');
    container.innerHTML = ''; // Clear previous

    outlineData.forEach(scene => {
        const item = document.createElement('div');
        item.className = 'outline-item';
        item.innerText = scene.title;
        item.onclick = () => jumpToScene(scene.line);
        container.appendChild(item);
    });
}
document.getElementById('outlineBtn').addEventListener('click', toggleOutline);

// Helper for pixel calculations
function getLineTop(lineNumber) {
    const style = window.getComputedStyle(editor);
    const ghost = document.createElement('div');

    // Copy all visual styles
    const properties = [
        'direction', 'boxSizing', 'width', 'fontSize', 'fontFamily',
        'fontStyle', 'fontWeight', 'lineHeight', 'paddingTop',
        'paddingBottom', 'paddingLeft', 'paddingRight', 'wordWrap', 'whiteSpace'
    ];
    properties.forEach(prop => ghost.style[prop] = style[prop]);

    ghost.style.position = 'fixed'; // Ensures it starts at 0,0 for math
    ghost.style.visibility = 'hidden';
    ghost.style.top = '0';
    ghost.style.left = '0';

    const lines = editor.value.split('\n');
    ghost.textContent = lines.slice(0, lineNumber).join('\n') + '\n';

    const marker = document.createElement('span');
    marker.textContent = 'X';
    ghost.appendChild(marker);

    document.body.appendChild(ghost);
    const top = marker.offsetTop;
    document.body.removeChild(ghost);

    return top;
}


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
const viewer = document.querySelector('.viewer-pane'); // The scrollable container

// Helper to find the "Top of Script" in both views
function getSyncAnchors() {
    const lines = editor.value.split('\n');
    const firstSceneIdx = lines.findIndex(line => /^(?:INT|EXT|EST|I\/E)\./i.test(line));

    if (firstSceneIdx === -1) return null;

    const editorLineHeight = parseFloat(getComputedStyle(editor).lineHeight);
    // Editor Anchor: The exact pixel where the first scene starts
    const editorAnchorY = firstSceneIdx * editorLineHeight;

    // Viewer Anchor: The exact pixel where the first <h3> (Scene) starts
    const previewHeadings = viewerPane.querySelectorAll('h3');
    let viewerAnchorY = 0;
    if (previewHeadings.length > 0) {
        // We use getBoundingClientRect or offsetTop relative to the parent
        const containerRect = viewerPane.getBoundingClientRect();
        const headingRect = previewHeadings[0].getBoundingClientRect();
        // This gives us the distance from the top of the scrollable area to the heading
        viewerAnchorY = headingRect.top - containerRect.top + viewerPane.scrollTop - 50;
    }

    return { editorAnchorY, viewerAnchorY };
}

// AUTOCOMEPLETING SCENES

let sceneMemory = [];
let activeIndex = -1;

function scene_search() {
    const cursorPos = editor.selectionStart;
    const textBefore = editor.value.substring(0, cursorPos);
    const lines = textBefore.split('\n');
    const currentLine = lines[lines.length - 1]; // Keep original casing for check

    // Trigger Logic:
    // If it starts with INT. or EXT. (Scenes)
    // OR if the line is ALL CAPS and at least 2 characters long (Characters)
    const isSceneTrigger = currentLine.toUpperCase().startsWith("INT.") || currentLine.toUpperCase().startsWith("EXT.");
    const isCharTrigger = currentLine.length >= 2 && currentLine === currentLine.toUpperCase() && !currentLine.startsWith(" ");

    if (isSceneTrigger || isCharTrigger) {
        showSuggestions(currentLine.toUpperCase(), cursorPos);
    } else {
        hideSuggestions();
    }
}

// 1. Build the memory from existing text
function updateSceneMemory() {
    const text = editor.value;
    const sceneRegex = /^((?:INT|EXT|EST|I\/E)\..*)/gm;

    // This looks for: Start of line, Uppercase Name, Newline, then NON-empty line (Dialogue)
    const charRegex = /^([A-Z][A-Z0-9\s\(\)\.]+)\n(?!\n|\s|$)/gm;

    const scenes = text.match(sceneRegex) || [];
    let characters = [];
    let match;

    while ((match = charRegex.exec(text)) !== null) {
        const name = match[1].trim();
        // Standard Fountain excludes:
        const filter = ["INT.", "EXT.", "EST.", "I/E.", "CUT TO", "FADE "];
        if (!filter.some(f => name.startsWith(f))) {
            characters.push(name);
        }
    }

    sceneMemory = [...new Set([...scenes, ...characters])].reverse();
}

function showSuggestions(input, pos) {
    updateSceneMemory();
    const list = document.getElementById('autocomplete-list') || createList();

    const filtered = sceneMemory
        .filter(item => item.startsWith(input) && item !== input)
        .slice(0, 5);

    if (filtered.length === 0) {
        hideSuggestions();
        return;
    }

    list.innerHTML = '';

    // CHANGE THIS: Start at 0 so the first item is always active
    activeIndex = 0;

    filtered.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';

        // ADD THIS: Apply the 'active' class immediately to the first item
        if (index === activeIndex) div.classList.add('active');

        const isScene = item.includes('.');
        const icon = isScene ? 'movie' : 'person';

        div.innerHTML = `
            <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle; margin-right:8px; opacity:0.6">${icon}</span>
            <span class="item-text">${item}</span>
        `;

        div.onclick = () => applySuggestion(item);
        list.appendChild(div);
    });

    const coords = getCursorXY(editor, pos);
    // const relativeY = coords.y - editor.scrollTop;

    list.style.position = 'fixed';
    list.style.left = coords.x + "px";
    list.style.top = (coords.y + 25) + "px";
    list.style.display = 'block';

    // Safety check: if the list goes off the bottom of the screen, show it ABOVE the cursor
    const listRect = list.getBoundingClientRect();
    if (coords.y + listRect.height > window.innerHeight) {
        list.style.top = (coords.y - listRect.height - 5) + "px";
    }
}


function applySuggestion(text) {
    const cursorPos = editor.selectionStart;
    const textBefore = editor.value.substring(0, cursorPos);
    const textAfter = editor.value.substring(cursorPos);

    // Replace the current line with the full suggestion
    const lines = textBefore.split('\n');
    lines[lines.length - 1] = text;

    editor.value = lines.join('\n') + textAfter;
    hideSuggestions();
    editor.focus();
    render(); // Update main UI
}

function hideSuggestions() {
    const list = document.getElementById('autocomplete-list');
    if (list) list.style.display = 'none';
}

function createList() {
    const list = document.createElement('div');
    list.id = 'autocomplete-list';
    document.body.appendChild(list);
    return list;
}

function getCursorXY(input, selectionPoint) {
    const rect = input.getBoundingClientRect(); // Get editor position on screen
    const div = document.createElement('div');
    const copyStyle = getComputedStyle(input);

    for (const prop of copyStyle) {
        div.style[prop] = copyStyle[prop];
    }

    div.style.position = 'fixed'; // Use fixed to match viewport
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.width = input.offsetWidth + 'px';

    div.textContent = input.value.substring(0, selectionPoint);
    const span = document.createElement('span');
    span.textContent = input.value.substring(selectionPoint) || '.';
    div.appendChild(span);

    document.body.appendChild(div);
    const spanRect = span.getBoundingClientRect();
    const { offsetLeft: spanLeft, offsetTop: spanTop } = span;
    document.body.removeChild(div);

    return {
        // Position relative to the editor container + the calculated span offset
        x: rect.left + spanLeft,
        y: rect.top + spanTop - input.scrollTop
    };

    //Also close the Library sidebar if open
    librarySidebar.classList.toggle('close');
}

editor.addEventListener('keydown', (e) => {
    const list = document.getElementById('autocomplete-list');
    if (!list || list.style.display === 'none') return;

    const items = list.querySelectorAll('.autocomplete-item');

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        updateActiveItem(items);
    } else if (e.key === 'Enter' && activeIndex > -1) {
        e.preventDefault();

        // FIX: Grab ONLY the text content of the .item-text span
        const cleanText = items[activeIndex].querySelector('.item-text').textContent;
        applySuggestion(cleanText);
    } else if (e.key === 'Escape') {
        hideSuggestions();
    }
});

function updateActiveItem(items) {
    items.forEach((item, index) => {
        item.classList.toggle('active', index === activeIndex);
    });
}

/*************************/

// CREATE LINE NUMBERS gutter
function updateGutter() {
  return;
    // const lineNumbersDiv = document.getElementById('line-numbers');
    // if (!lineNumbersDiv) return;
    //
    // const style = window.getComputedStyle(editor);
    // let lh = parseFloat(style.lineHeight);
    // const fs = style.fontSize;
    // if (isNaN(lh)) lh = parseFloat(fs) * 1.5;
    //
    // const scrollTop = editor.scrollTop;
    // const viewHeight = editor.clientHeight;
    //
    // // 1. Calculate which line is at the top of the viewport
    // const startLine = Math.floor(scrollTop / lh) + 1;
    // // 2. Calculate how many lines can fit on the screen
    // const linesToDraw = Math.ceil(viewHeight / lh) + 2;
    // const totalLines = editor.value.split('\n').length;
    //
    // // 3. The "Shifter" moves only by the sub-pixel remainder of the scroll
    // const offset = scrollTop % lh;
    //
    // let html = `<div id="gutter-shifter" style="position: absolute; top: ${-offset}px; width: 100%;">`;
    // for (let i = 0; i < linesToDraw; i++) {
    //     const lineNum = startLine + i;
    //     if (lineNum <= totalLines) {
    //         html += `<div style="height:${lh}px; line-height:${lh}px; font-size:${fs};">${lineNum}</div>`;
    //     }
    // }
    // html += `</div>`;
    //
    // lineNumbersDiv.innerHTML = html;
}

// Ensure the scroll listener refreshes this window
editor.addEventListener('scroll', () => {
    updateGutter();
});

// function that closes the library sidebar
function closeLibrary() {
    if (librarySidebar.classList.contains('open')) {
        librarySidebar.classList.remove('open');
        console.log("Library closed via workspace interaction.");
    }
}

// function close outliner
function closeOutliner(){
    if (outlineSidebar.classList.contains('open')) {
        outlineSidebar.classList.remove('open');
        console.log("Outliner closed.");
    }
}

// Add listener to textarea to lookout of cursor changes and selectionStart
document.addEventListener('selectionchange', () => {
    if (isJumping && targetLineForScroll !== null && document.activeElement === editor) {

        const mirror = document.createElement('div');
        const style = window.getComputedStyle(editor);

        // Copy styles exactly
        const props = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'padding', 'width', 'boxSizing', 'whiteSpace', 'wordWrap'];
        props.forEach(prop => mirror.style[prop] = style[prop]);

        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap'; // CRITICAL: Handles wrapping correctly
        mirror.style.width = editor.clientWidth + 'px'; // Matches editor width

        const textUpToSelection = editor.value.substring(0, editor.selectionStart);
        mirror.textContent = textUpToSelection;

        const span = document.createElement('span');
        span.textContent = 'X';
        mirror.appendChild(span);

        document.body.appendChild(mirror);
        const exactPixelTop = span.offsetTop;
        document.body.removeChild(mirror);

        // --- THE PRECISION ADJUSTMENT ---
        // We must account for the editor's own padding-top which is in the CSS
        const paddingTop = parseFloat(style.paddingTop) || 0;

        // We want the 'exactPixelTop' to be in the center of the 'editor.clientHeight'
        const finalScrollPosition = exactPixelTop - (editor.clientHeight / 2) + paddingTop;

        console.log(`Line ${targetLineForScroll} is at ${exactPixelTop}px. Scrolling to: ${finalScrollPosition}px`);

        editor.scrollTo({
            top: finalScrollPosition,
            behavior: 'smooth'
        });

        syncOutputToLine(targetLineForScroll);

        isJumping = false;
        targetLineForScroll = null;
    }
});

function selectTextByLine(lineIndex) {
    const lines = editor.value.split('\n');
    let charPos = 0;
    for (let i = 0; i < lineIndex; i++) {
        charPos += lines[i].length + 1;
    }
    editor.focus();
    const lineLength = lines[lineIndex] ? lines[lineIndex].length : 0;
    editor.setSelectionRange(charPos, charPos + lineLength);
}

// Update the scroll listener to call the new virtual gutter logic
editor.addEventListener('scroll', () => {
    const innerGutter = document.getElementById('gutter-inner');
    if (innerGutter) {
        // We move the numbers UP by the same amount the editor scrolls DOWN
        innerGutter.style.transform = `translateY(-${editor.scrollTop}px)`;
    }
});

// Keep the line numbers in sync with the editor's scroll position
editor.addEventListener('scroll', () => {
    const lineNumbersDiv = document.getElementById('line-numbers');
    if (lineNumbersDiv) {
        // Pixel-perfect sync
        lineNumbersDiv.scrollTop = editor.scrollTop;
    }
});

/**********   Click and highlight ***/
editor.addEventListener('click', (e) => {
    // --- PART 1: EDITOR SCROLLING (Using Coordinate Math) ---
    // This part handles the "jump to center" for the textarea
    const rect = editor.getBoundingClientRect();
    const clickY = e.clientY - rect.top + editor.scrollTop;
    const style = window.getComputedStyle(editor);
    const lineHeight = parseFloat(style.lineHeight) || 24;
    const visualLine = Math.floor(clickY / lineHeight);

    // close Sidebar forlibrary
    closeLibrary();

    editor.scrollTo({
        top: (visualLine * lineHeight) - (editor.clientHeight / 2) + (lineHeight / 2),
        behavior: 'smooth'
    });

    // --- PART 2: OUTPUT SYNC (Using the working Character-Count method) ---
    // This part handles the Output/Preview highlighting and scrolling
    const textUpToCursor = editor.value.substring(0, editor.selectionStart);
    let clickedLine = textUpToCursor.split('\n').length - 1;

    // Get fresh tokens
    const result = fountainInstance.parse(editor.value);
    const tokens = result.tokens;

    // Fuzzy search: Find the nearest token by looking upwards
    let targetTokenIndex = -1;
    let lookUpLine = clickedLine;

    while (lookUpLine >= 0 && targetTokenIndex === -1) {
        targetTokenIndex = tokens.findIndex(t => t.line === lookUpLine);
        lookUpLine--;
    }

    if (targetTokenIndex !== -1) {
        const element = output.querySelector(`[data-token-index="${targetTokenIndex}"]`);

        if (element) {
            // Clear old highlights
            output.querySelectorAll('.sync-highlight').forEach(el => el.classList.remove('sync-highlight'));

            // Add new highlight
            element.classList.add('sync-highlight');

            // Scroll preview to match
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
});

// Add event listener t o the output as well
// listener for clicking the Preview window (Reverse Sync)
output.addEventListener('click', (e) => {
    const target = e.target.closest('[data-line]');

    //close outliner
    closeOutliner();

    if (target) {
        const lineNum = parseInt(target.getAttribute('data-line'), 10);
        console.log("Output Clicked! HTML Line Attribute:", lineNum);

        isJumping = true;
        targetLineForScroll = lineNum;

        selectTextByLine(lineNum);
    } else {
        console.log("Output clicked, but no [data-line] attribute found on element.");
    }
});

// Highlight

function highlightPreviewElement(index) {
    const output = document.getElementById('output');

    // Clear old highlights
    output.querySelectorAll('.sync-highlight').forEach(el => el.classList.remove('sync-highlight'));

    // Find the element with the matching index
    const element = output.querySelector(`[data-token-index="${index}"]`);

    if (element) {
        element.classList.add('sync-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Toggle Sync Scroll option
syncToggleBtn.addEventListener('click', () => {
    isSyncScrollEnabled = !isSyncScrollEnabled;

    const icon = syncToggleBtn.querySelector('.material-symbols-outlined');
    const text = syncToggleBtn.querySelector('.toggle-text');

    if (isSyncScrollEnabled) {
        icon.style.color = "#0fa9e5"; // Active color
        text.innerText = "Sync ON";
    } else {
        icon.style.color = "#888"; // Disabled color
        text.innerText = "Sync OFF";
    }
});


// board
document.getElementById('boardToggleBtn').addEventListener('click', () => {
    BoardApp.launch(editor.value);
});

// CHECKING IF LIBRARY IS empty.. IF YES THEN PUT WELCOM.html
async function initializeLibrary() {
    const library = JSON.parse(localStorage.getItem('fountain_library') || '{}');
    const lastActive = localStorage.getItem('last_active_script');

    // 1. If library is totally empty, create the Welcome Script
    if (Object.keys(library).length === 0) {
        try {
            console.log("Library is empty. Creating Welcome Script...");
            const response = await fetch('./welcome.fountain');
            if (!response.ok) throw new Error("File not found");
            const content = await response.text();

            // Save into your existing library format
            const welcomeTitle = "Welcome to OpenDraft";
            library[welcomeTitle] = content;
            localStorage.setItem('fountain_library', JSON.stringify(library));

            // Set as active and load it
            loadFromLibrary(welcomeTitle);
        } catch (err) {
            console.error("Welcome script fetch failed:", err);
            // Fallback if the fetch fails so the user isn't stuck
            library["New Script"] = "";
            localStorage.setItem('fountain_library', JSON.stringify(library));
            loadFromLibrary("New Script");
        }
    }
    // 2. If library has content, just load the last active one
    else {
        const titleToLoad = lastActive && library[lastActive] ? lastActive : Object.keys(library)[0];
        loadFromLibrary(titleToLoad);
    }
}

async function loadWelcomeScript() {
    try {
        const response = await fetch('welcome.fountain');
        const text = await response.text();
        editor.value = text;
        updatePreview();
    } catch (err) {
        console.error("Could not load welcome script:", err);
    }
}

function updatePreview() {
    const editor = document.getElementById('editor'); // or your editor variable
    const output = document.getElementById('output'); // or your output variable

    if (!editor || !output) return;

    // 1. Get the text from editor
    const markdown = editor.value;

    // 2. Use your fountain instance to parse it
    // Assuming you named your instance 'fountain' or 'fountainInstance'
    const result = fountainInstance.parse(markdown);

    // 3. Update the HTML
    output.innerHTML = result.html;

    // 4. Update the Board (if you have that logic integrated)
    if (window.updateBoard) {
        window.updateBoard(result.tokens);
    }
}

// --- 6. Initialization ---

function refreshApp() {
    const script = editor.value;
    const result = fountain().parse(script);

    // Update Preview
    document.getElementById('output').innerHTML = result.html;

    // Update Outline
    renderOutline(result.outline);
}

window.addEventListener('DOMContentLoaded', () => {
    container.classList.add('show-preview');

    // This handles the Welcome logic AND the Library loading
    initializeLibrary();
    updateGutter();

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
