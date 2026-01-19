// board.js - The "Big Big Feature" Engine

const BoardApp = {
    titlePage: "", // The "Vault" for your title/intro
    currentScenes: [],

    init() {
        // Find buttons after DOM is ready
        const commitBtn = document.getElementById('commitBoardBtn');
        const closeBtn = document.getElementById('closeBoardBtn');

        if (commitBtn) commitBtn.onclick = () => this.commit();
        if (closeBtn) closeBtn.onclick = () => this.close();

        console.log("Board Engine Initialized");
    },

    launch(text) {
        document.getElementById('board-pane').style.display = 'flex';
        document.body.classList.add('board-active');
        this.parse(text);
    },

    parse(text) {
        const container = document.getElementById('card-container');
        container.innerHTML = '';

        // Strict Scene Heading Regex
        const sceneRegex = /^((?:\.?(?:INT|EXT|EST|I\/E)[ .].*))/gm;
        const chunks = text.split(sceneRegex);

        this.titlePage = chunks[0] || "";
        this.currentScenes = [];

        for (let i = 1; i < chunks.length; i += 2) {
            this.currentScenes.push({
                heading: chunks[i].trim(),
                content: chunks[i+1] ? chunks[i+1].trim() : ""
            });
        }
        this.render();
    },

    render() {
        const container = document.getElementById('card-container');
        this.currentScenes.forEach((scene) => {
            const card = document.createElement('div');
            card.className = 'scene-card';

            card.innerHTML = `
                <h4>${scene.heading}</h4>
                <textarea class="scene-editor-textarea">${scene.content}</textarea>
            `;
            container.appendChild(card);
            const textarea = card.querySelector('textarea');
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        });

        // Re-initialize Sortable with a specific handle
        if (typeof Sortable !== 'undefined') {
            new Sortable(container, {
                animation: 150,
                handle: 'h4',           // Only drag by the heading
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                forceFallback: true,    // Use JS-based dragging (much smoother with transforms)
                fallbackOnBody: true,   // Keeps the card from getting "cut off" by container edges
                swapThreshold: 0.65     // Makes it easier to trigger a swap
            });
        }


    },

    commit() {
        const cards = document.querySelectorAll('.scene-card');
        let newScript = this.titlePage.trim(); // Start with the saved Title Page

        cards.forEach(card => {
            const heading = card.querySelector('h4').innerText;
            const body = card.querySelector('textarea').value; // Get the EDITED text

            // Re-stitch with double newlines for proper Fountain formatting
            newScript += `\n\n${heading}\n${body}`;
        });

        const editor = document.getElementById('editor');
        editor.value = newScript.trim();

        // Refresh the main app (assuming these functions exist in script.js)
        if (typeof render === 'function') render();
        if (typeof autoSave === 'function') autoSave();

        this.close();
    },

    close() {
        document.getElementById('board-pane').style.display = 'none';
        document.body.classList.remove('board-active');
    }
};

// Initialize when scripts are loaded
window.addEventListener('DOMContentLoaded', () => BoardApp.init());
