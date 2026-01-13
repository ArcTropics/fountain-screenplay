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


let currentFontSize = 18;

// --- 1. RENDER LOGIC ---
function render() {
    // 1. Get the raw text from the editor
    const rawText = editor.value.trim();

    // 2. If the editor is empty, show the placeholder message and stop
    if (!rawText) {
        output.innerHTML = `
            <div style="text-align: center; color: #888; margin-top: 100px;">
                <span class="material-symbols-outlined" style="font-size: 48px; display: block; margin-bottom: 10px;">edit_note</span>
                <p>It seems like your script is empty. <br> Please type something to view the preview.</p>
            </div>`;
        return;
    }

    // 3. Otherwise, proceed with parsing
    const result = fountain.parse(rawText);

    // We use "|| ''" to ensure that if title_page or script is missing, it doesn't say "undefined"
    let htmlOutput = (result.html.title_page || "") + (result.html.script || "");

    // 4. Apply your custom {{ note }} logic
    const customNoteRegex = /\{\{([\s\S]*?)\}\}/g;
    htmlOutput = htmlOutput.replace(customNoteRegex, function(match, noteText) {
        return '<div class="note">' + noteText.trim() + '</div>';
    });

    output.innerHTML = htmlOutput;
}

// --- 2. TOGGLE NOTES ---
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

// --- 3. SHOW/HIDE PREVIEW ---
function togglePreview() {
    container.classList.toggle('show-preview');

    if (container.classList.contains('show-preview')) {
        togglePreviewBtn.innerText = "Hide Preview";
    } else {
        togglePreviewBtn.innerText = "Show Preview";
    }
}

// --- 4. FONT SIZE LOGIC ---
function updateFontSize(delta) {
    currentFontSize = Math.min(Math.max(currentFontSize + delta, 10), 40);
    editor.style.fontSize = `${currentFontSize}px`;
    fontSizeDisplay.innerText = `${currentFontSize}px`;
}

// --- 5. FILE OPERATIONS ---
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
        // Removed alert for better UX, but you can add it back if you like
    } catch (err) { console.error("Save cancelled", err); }
}

// --- 6. KEYBOARD SHORTCUTS ---
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

// --- 7. EVENT LISTENERS ---
editor.addEventListener('input', render);
toggleNotesBtn.addEventListener('click', toggleNotes);
togglePreviewBtn.addEventListener('click', togglePreview);
increaseBtn.addEventListener('click', () => updateFontSize(2));
decreaseBtn.addEventListener('click', () => updateFontSize(-2));
openBtn.addEventListener('click', openFile);
saveBtn.addEventListener('click', saveFile);

// --- 8. INITIALIZATION ---
// This ensures the UI matches your "Hidden Preview" CSS on load
render();
