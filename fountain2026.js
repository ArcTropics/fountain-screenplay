// Fountain.js - Modernized for 2026
// Based on Matt Daly's original, updated for full Fountain.io spec
// modified by Vinimay Kaul

(function (root) {
  'use strict';

  var fountain = function () {
    var regex = {
      title_page: /^([^\/:]+):(.+)/gm,
      section: /^(#+)(?: *)(.*)/gm,
      synopsis: /^(?:=(?!=+) *)(.*)/gm,
      scene_heading: /^((?:\.(?!\.+))|(?:(?:INT|EXT|EST|I\/E)[. ]+)|(?:(?:INT|EXT|EST|I\/E)(?:\/| )))(.*)/gim,
      scene_number: /(?: *)(#.+)$/,
      transition: /^((?:[A-Z ]+ TO:)|(?:>.*))$/m,
      dialogue: /^([A-Z\s\d\(\)\.\-]+)(\^?) *$/m,
      // parenthetical: /^(\(.+\))$/gm,
      parenthetical: /^(\(.*\))$/gm,
      action: /^(.+)/gm,
      centered: /^(?: *> *)(.+)(?: *< *)$/gm,
      italic: /(_|(?:\*+))(?=.+?\1)/g,
      bold: /(_|(?:\*+))(?=.+?\1)/g,
      note: /\[{2}([\s\S]*?)\]{2}/gm,
      boneyard: /\/\*([\s\S]*?)\*\//gm,
      page_break: /^={3,}\s*$/gm,
      line_break: /^ {2}$/gm

    };

    var parse = function (script) {
      var source = script.replace(/\r\n|\r/g, '\n').concat('\n\n');
      var tokens = [];

      // Handle Boneyard (/* comments */)
      source = source.replace(regex.boneyard, '');

      // Handle Title Page
      var title_page = [];
      var sourceLines = source.split('\n');
      var metadataEndIndex = 0;
      var isContactBlock = false;
      var currentContact = [];

      for (var i = 0; i < sourceLines.length; i++) {
        var line = sourceLines[i]; // not trimming here since i need to detect indentation for Contact section
        var trimmed = line.trim();

        // If we hit a Scene Heading or transition, the title page is over
        if (trimmed.match(regex.scene_heading) || trimmed.match(regex.transition)) {
            metadataEndIndex = i;
            break;
        }


        // If it looks like KEY: VALUE
        if (trimmed.includes(':')) {
          var parts = trimmed.split(':');
          var key = parts[0].trim().toLowerCase().replace(' ', '_');
          var value = parts.slice(1).join(':').trim();

          if (key === "contact") {
            isContactBlock = true;
            if (value) currentContact.push(value);
          } else {
            // If we find a new key, the contact block is definitely over
            if (isContactBlock && currentContact.length > 0) {
              title_page.push({ type: "contact", text: currentContact.join('\n') });
              currentContact = [];
            }
            isContactBlock = false;
            title_page.push({ type: key, text: value });
          }
        }
        // If we are in a contact block and the line is indented or just text
        else if (isContactBlock && trimmed !== "") {
          currentContact.push(trimmed);
        }
        // A blank line ends the contact block
        else if (trimmed === "" && isContactBlock) {
          isContactBlock = false;
          title_page.push({ type: "contact", text: currentContact.join('\n') });
          currentContact = [];
        }
        // If it's a blank line and NOT a contact block, title page is over
        else if (trimmed === "" && !isContactBlock && title_page.length > 0) {
          metadataEndIndex = i;
          break;
        }
      }

      // Final push for contact if it's the last thing in the header
      if (isContactBlock && currentContact.length > 0) {
        title_page.push({ type: "contact", text: currentContact.join('\n') });
      }

      source = sourceLines.slice(metadataEndIndex).join('\n');

      // --- Parser Phase 2: Block Elements ---
      var lines = source.split('\n');
      var is_dialogue = false;

      lines.forEach(function(line) {
        // Scene Headings
        if (line.match(regex.scene_heading)) {
          var match = line.match(regex.scene_heading);
          var text = line.replace(/^\./, '');
          var scene_number = null;
          if (text.match(regex.scene_number)) {
            scene_number = text.match(regex.scene_number)[1].replace(/#/g, '');
            text = text.replace(regex.scene_number, '');
          }
          tokens.push({ type: 'scene_heading', text: text, scene_number: scene_number });
          is_dialogue = false; return;
        }

        // Sections
        if (line.match(regex.section)) {
          var match = line.match(regex.section);
          tokens.push({ type: 'section', text: match[0].replace(/#/g, '').trim(), depth: (match[0].match(/#/g) || []).length });
          return;
        }

        // Synopses
        if (line.match(regex.synopsis)) {
          tokens.push({ type: 'synopsis', text: line.replace('=', '').trim() });
          return;
        }

        // Centered
        if (line.match(regex.centered)) {
          tokens.push({ type: 'centered', text: line.replace(/>|</g, '').trim() });
          return;
        }

        // Transitions
        if (line.match(regex.transition)) {
          tokens.push({ type: 'transition', text: line.replace('>', '').trim() });
          return;
        }

        // Dialogue & Characters
        if (line.match(regex.dialogue)) {
          var match = line.match(regex.dialogue);
          tokens.push({ type: 'character', text: match[1].trim(), dual: !!match[2] });
          is_dialogue = true; return;
        }

        if (is_dialogue) {
          if (line.match(regex.parenthetical)) {
            tokens.push({ type: 'parenthetical', text: line.trim() });
            return;
          }
          if (line.trim().length > 0) {
            tokens.push({ type: 'dialogue', text: line.trim() });
            return;
          }
          is_dialogue = false;
        }

        // FOr page Break
        if (line.match(regex.page_break)) {
            tokens.push({ type: 'page_break' });
            return;
        }

        // Notes (Custom implementation)
        if (line.match(/\{\{(.*?)\}\}/)) {
           tokens.push({ type: 'note', text: line.replace(/\{\{|\}\}/g, '').trim() });
           return;
        }

        // Action
        if (line.trim().length > 0) {
          tokens.push({ type: 'action', text: line.trim() });
        }




      });

      // --- Parser Phase 3: HTML Generation ---
      var html = [];

      // Render Title Page
      // Render Title Page
      if (title_page.length > 0) {
          html.push('<div class="title-page">');

          let contactLines = [];
          let draftDate = "";

          title_page.forEach(i => {
              if (i.type === 'contact') {
                  contactLines.push(i.text);
              } else if (i.type === 'draft_date') {
                  draftDate = i.text;
              } else {
                  // Title, Author, etc. stay centered
                  html.push(`<p class="tp-${i.type}">${i.text}</p>`);
              }
          });

          // Grouping Date and Contact for the Bottom-Left corner
          if (draftDate || contactLines.length > 0) {
              html.push('<div class="tp-bottom-left-group">');
              if (draftDate) {
                  html.push(`<p class="tp-draft_date">${draftDate}</p>`);
              }
              if (contactLines.length > 0) {
                  // Join address lines with breaks
                  html.push(`<div class="tp-contact-block">${contactLines.join('<br>')}</div>`);
              }
              html.push('</div>');
          }

          html.push('</div>');
          html.push('<div class="page-break"></div>');
      }

      tokens.forEach(function(token) {
        switch (token.type) {
          case 'scene_heading':
            html.push(`<h3>${token.text}${token.scene_number ? '<span class="scene-number">'+token.scene_number+'</span>' : ''}</h3>`);
            break;
          case 'section':
            html.push(`<div class="section-heading" data-depth="${token.depth}">${token.text}</div>`);
            break;
          case 'synopsis':
            html.push(`<div class="synopsis">${token.text}</div>`);
            break;
          case 'character':
            // Removed the <div> wrapper that was causing the layout mess
            html.push(`<h4 class="${token.dual ? 'dual' : ''}">${token.text}</h4>`);
            break;
          case 'dialogue':
            html.push(`<p class="dialogue">${token.text}</p>`);
            break;
          case 'parenthetical':
              html.push(`<p class="parenthetical">${token.text}</p>`);
              break;

          case 'transition':
            html.push(`<h2>${token.text}</h2>`);
            break;
          case 'centered':
            html.push(`<p class="centered">${token.text}</p>`);
            break;
          case 'note':
            html.push(`<div class="note">[[ ${token.text} ]]</div>`);
            break;
          case 'action':
            html.push(`<p>${token.text}</p>`);
            break;
          case 'page_break':
            html.push('<div class="page-break"></div>');
            break;

      // ... can add other cases (scene_heading, character, etc.)
        }
      });

      return { title: title_page.find(t => t.type === 'title')?.text || "Untitled", html: html.join('') };
    };

    return { parse: parse };
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = fountain; }
  else { root.fountain = fountain; }
})(this);
