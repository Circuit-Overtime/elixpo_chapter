const editor = document.getElementById('editor');
let highlightTimeout;
const inlineStyleMap = [
  {
    regex: /(^|\s)\*\*(?!\s)(.+?)(?<!\s)\*\*(?=\s|$)/, 
    className: 'bold'
  },
  {
    regex: /(^|\s)\*(?!\s)([^*]+?)(?<!\s)\*(?=\s|$)/,  
    className: 'italic'
  },
  {
    regex: /(^|\s)_(?!\s)([^_]+?)(?<!\s)_(?=\s|$)/,   
    className: 'italic'
  },
  {
    regex: /(^|\s)~~(?!\s)(.+?)(?<!\s)~~(?=\s|$)/,     
    className: 'strikethrough'
  },
  {
    regex: /(^|\s)__(?!\s)(.+?)(?<!\s)__(?=\s|$)/,      
    className: 'underline'
  },
  {
    regex: /(^|\s)==(?!\s)(.+?)(?<!\s)==(?=\s|$)/,      
    className: 'highlight'
  },
    {
    regex: /(^|\s)`([^`\s\u200B\u2060][^`]*?)`(?=\s|$)/,
    className: 'inline_code'
    },

  {
    regex: /(^|\s)\[(.+?)\]\((.+?)\)(?=\s|$)/,          
    className: 'link',
    isLink: true
  }
];


function createHashID(timeStamp = new Date()) {
    const headingLevel = typeof timeStamp === 'number' ? timeStamp : 1;
    const safeLevel = Math.min(6, Math.max(1, headingLevel));
    const hexId = timeStamp.getTime().toString(16);
    return `${hexId}_${safeLevel}`;
}
function createNewSection(headingLevel = 1, id) {
    return `
        <section id="section_${id}" contenteditable="true" data-slate-node="element">
            <h${headingLevel} data-slate-node="element">
                <span data-slate-node="text">
                    <span data-slate-leaf="true">&#8288;</span>
                </span>
            </h${headingLevel}>
            ${createParagraph()}
        </section>
    `;
}

function createParagraph(hexID) {
    return `
        <p id="paragraph_${hexID}" data-slate-node="element">
            <span data-slate-node="text">
                <span data-slate-leaf="true">&#8288;</span>
            </span>
        </p>
    `;
}

function createCodeBlock(hexID) {
  return `
    <pre data-slate-node="element" contenteditable="false">
      <code contenteditable="true" id="code_${hexID}" class="code_block hljs" data-slate-node="code"></code>
      <i class='bx bx-copy' data-copy-btn></i>
    </pre>
  `;
}

function createHorizontalRule(hexID) {
    return `
    <div id="divider_${hexID}" data-slate-node="element" data-slate-void="true" class="divider isSelected">
        <hr data-slate-node="element" data-slate-void="true" class="isSelected">
    </div>
    `;
}

function createBlockquote(hexID) {
    return `
        <blockquote>
            <span id="blockquote_${hexID}" data-slate-node="text">
                <span data-slate-leaf="true">&nbsp;</span>
            </span>
        </blockquote>
    `;
}


function formatBlockStyles(leafSpan, text) {
  const headingRegex = /^\u2060*(#{1,6})[\u00A0\s]/;
  const codeBlockRegex = /^\u2060*```[\u00A0\s]?$/;
  const horizontalRuleRegex = /^\u2060*---[\u00A0\s]?$/;
  const blockquoteRegex = /^\u2060*>[\u00A0\s]?/;
  const headingMatch = text.match(headingRegex);

  if (headingMatch) 
  {
    console.log("Heading detected");
  const hashes = headingMatch[1];
  const headingLevel = hashes.length;

  const parentP = leafSpan.closest('p[data-slate-node="element"]');
  const currentSection = parentP?.closest('section');
  if (!currentSection) return;

  // Remove invisible characters and heading markdown
  const cleanedText = leafSpan.textContent
    .replace(/\u2060/g, '')              
    .replace(headingRegex, '');          
  leafSpan.textContent = cleanedText;

  const hexId = createHashID();
  const newSectionNode = createNewSection(headingLevel, hexId);

  let newHeadingSpan = null;

  if (editor.children.length === 1 && editor.firstElementChild === currentSection) {
    currentSection.outerHTML = newSectionNode;
    const updatedSection = editor.querySelector(`#section_${hexId}`);
    newHeadingSpan = updatedSection.querySelector(`h${headingLevel} > span`);
  } else {
    editor.insertAdjacentHTML('beforeend', newSectionNode);
    const lastSection = editor.querySelector('section:last-of-type');
    newHeadingSpan = lastSection.querySelector(`h${headingLevel} > span`);
  }

  if (newHeadingSpan) {
    newHeadingSpan.innerHTML = ''; // Clear placeholder
    newHeadingSpan.textContent = cleanedText;
    formatInlineStyles(newHeadingSpan);

    const newLeaf = newHeadingSpan.querySelector('span[data-slate-leaf="true"]');
    if (newLeaf) {
      const range = document.createRange();
      range.selectNodeContents(newLeaf);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
  }

  
  else if (codeBlockRegex.test(text)) {
  console.log("Code block trigger detected");

  const parentP = leafSpan.closest('p[data-slate-node="element"]');
  const currentSection = leafSpan.closest('section');
  if (!parentP || !currentSection) return;

  const hexId = createHashID();
  const codeHTML = createCodeBlock(hexId);

  const temp = document.createElement('div');
  temp.innerHTML = codeHTML;
  const newCodeBlock = temp.firstElementChild;

  currentSection.insertBefore(newCodeBlock, parentP.nextSibling);
  parentP.remove(); // Remove trigger line (```)

  // Move focus inside the code span
  const codeLeaf = newCodeBlock.querySelector('code span[data-slate-leaf="true"]');
  if (codeLeaf) {
    const range = document.createRange();
    range.selectNodeContents(codeLeaf);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  requestAnimationFrame(() => {
  if (typeof hljs !== "undefined") {
    newCodeBlock.querySelectorAll('code').forEach(code => {
      hljs.highlightElement(code);
    });
  }
});

}

else if (horizontalRuleRegex.test(text)) {
    console.log("Horizontal rule detected");

    const parentP = leafSpan.closest('p[data-slate-node="element"]');
    const currentSection = leafSpan.closest('section');
    if (!parentP || !currentSection) return;

    const hexId = createHashID();
    const hrHTML = createHorizontalRule(hexId);

    // Insert HR
    currentSection.insertAdjacentHTML('beforeend', hrHTML);
    parentP.remove();

    // Create new paragraph after HR
    const newParaId = createHashID();
    const newParagraph = createParagraph(newParaId);
    const temp = document.createElement('div');
    temp.innerHTML = newParagraph;
    const newP = temp.firstElementChild;

    // Insert after HR
    const newHr = currentSection.querySelector(`hr[data-slate-node="element"]`);
    if (newHr) {
        newHr.parentElement.insertAdjacentElement('afterend', newP);

        // Set caret inside the new paragraph
        requestAnimationFrame(() => {
            const newLeaf = newP.querySelector('span[data-slate-leaf="true"]');
            if (newLeaf) {
                const range = document.createRange();
                range.selectNodeContents(newLeaf);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
    }
}

else if (blockquoteRegex.test(text)) {
    console.log("Blockquote detected");

    const parentP = leafSpan.closest('p[data-slate-node="element"]');
    const currentSection = leafSpan.closest('section');
    if (!parentP || !currentSection) return;

    const hexId = createHashID();
    const blockquoteHTML = createBlockquote(hexId);

    // Insert blockquote
    currentSection.insertAdjacentHTML('beforeend', blockquoteHTML);
    parentP.remove();

    requestAnimationFrame(() => {
        const newBlockquote = currentSection.querySelector(`blockquote`);
        if (newBlockquote) {
            const newLeaf = newBlockquote.querySelector('span[data-slate-leaf="true"]');
            if (newLeaf) {
                const range = document.createRange();
                range.selectNodeContents(newLeaf);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    });
}
}




function formatInlineStyles(hElement) {
    const rawText = hElement.innerText;
    let remaining = rawText;
    hElement.innerHTML = '';
    let addedAny = false;
    while (remaining.length > 0) {
        let matched = false;
        for (const { regex, className, isLink } of inlineStyleMap) {
            const match = remaining.match(regex);
            if (match) {
                matched = true;
                const before = remaining.slice(0, match.index);
                if (before) {
                    hElement.appendChild(makeTextSpan(before));
                    hElement.appendChild(makeSpacer());
                    addedAny = true;
                }
                const styledText = match[1];
                const span = document.createElement('span');
                span.setAttribute('data-slate-node', 'text');
                if (className) span.classList.add(className);
                const inner = document.createElement('span');
                inner.setAttribute('data-slate-leaf', 'true');
                if (isLink) {
                    const a = document.createElement('a');
                    a.href = match[2];
                    a.target = "_blank";
                    a.textContent = styledText;
                    inner.appendChild(a);
                } else {
                    inner.textContent = styledText;
                }
                span.appendChild(inner);
                hElement.appendChild(span);
                hElement.appendChild(makeSpacer());
                remaining = remaining.slice(match.index + match[0].length);
                addedAny = true;
                break;
            }
        }
        if (!matched) {
            if (remaining.trim() !== '') {
                hElement.appendChild(makeTextSpan(remaining));
                addedAny = true;
            }
            break;
        }
    }
    if (!addedAny) {
        const empty = makeTextSpan('\u200B');
        hElement.appendChild(empty);
    }
}

function makeTextSpan(text) {
    const span = document.createElement('span');
    span.setAttribute('data-slate-node', 'text');
    const inner = document.createElement('span');
    inner.setAttribute('data-slate-leaf', 'true');
    inner.textContent = text;
    span.appendChild(inner);
    return span;
}

function makeSpacer() {
    const span = document.createElement('span');
    span.setAttribute('data-slate-node', 'text');
    const inner = document.createElement('span');
    inner.setAttribute('data-slate-leaf', 'true');
    inner.innerHTML = '&nbsp;';
    span.appendChild(inner);
    return span;
}

function createSpanAndInsert(blockParent, text, className, isFirst = false) {
    text = text.replace(/\u200B/g, '').trim(); // clean up input
    const hexID = createHashID();

    const leftSpacer = `
        <span id="left_spacer_inline_${hexID}" data-slate-node="text">
            <span data-slate-leaf="true">&nbsp; </span>
        </span>`;

    const rightSpacer = `
        <span id="right_spacer_inline_${hexID}" data-slate-node="text">
            <span data-slate-leaf="true">&nbsp; </span>
        </span>`;

    const styledSpan = `
        <span id="inline_${hexID}" data-slate-node="text" ${className ? `class="${className}"` : ''}>
            <span data-slate-leaf="true">${text}</span>
        </span>`;

    // Insert spans in the right order
    if (isFirst) {
        blockParent.insertAdjacentHTML('beforeend', leftSpacer);
    }

    blockParent.insertAdjacentHTML('beforeend', styledSpan);
    blockParent.insertAdjacentHTML('beforeend', rightSpacer);

    // Set caret inside right spacer
    const newSpan = blockParent.querySelector(`#right_spacer_inline_${hexID}`);
    if (newSpan) {
        const range = document.createRange();
        range.selectNodeContents(newSpan);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

editor.addEventListener('input', (event) => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const node = selection.anchorNode;
  const element = node?.nodeType === 3 ? node.parentElement : node;

  const advertElement = document.querySelector('[data-slate-advertisement]');
  if (advertElement) {
    advertElement.parentElement.setAttribute('contenteditable', 'true');
    advertElement.remove();
  }

  if (element?.dataset?.slateLeaf === "true") {
    const rawText = element.textContent;
    const cleanText = rawText.replace(/\u200B/g, '').replace(/\u00A0/g, ' ');
    const blockParent = element.closest('p, h1, h2, h3, h4, h5, h6');
    if (!blockParent) return;

    if ((blockParent.tagName === 'P') || blockParent.tagName === 'H1' || blockParent.tagName === 'H2' || blockParent.tagName === 'H3' || blockParent.tagName === 'H4' || blockParent.tagName === 'H5' || blockParent.tagName === 'H6') {
for (const { regex, className } of inlineStyleMap) {
      const match = cleanText.match(regex);
      if (match) {
        event.preventDefault();
        const fullMatch = match[0];
        const matchedText = match[2].trim();
        const matchStart = cleanText.indexOf(fullMatch);
        const matchEnd = matchStart + fullMatch.length;
        const beforeText = cleanText.slice(0, matchStart);
        const afterText = cleanText.slice(matchEnd);
        element.textContent = ' ';
        if (element === blockParent.firstElementChild) {
          createSpanAndInsert(blockParent, matchedText, className, true);
        } else {
          createSpanAndInsert(blockParent, matchedText, className);
        }
        break;
      }
    }

      formatBlockStyles(element, cleanText);
      console.log("in p tag");
    }

    

    document.querySelectorAll('code.code_block').forEach(code => {
        console.log("Code block detected");
    if (typeof hljs !== "undefined") {
        const result = hljs.highlightAuto(code.innerText);
        code.innerHTML = result.value;
        code.className = `code_block hljs language-${result.language}`;
    }
    });
    formatBlockStyles(element, cleanText);
  
  }
});

editor.addEventListener('keydown', (event) => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const startElement = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
    const codeBlock = startElement?.closest('section')?.querySelector('code.code_block') || startElement?.closest('code.code_block');
    console.log("Code block found:", codeBlock);
    console.log("Code block found:", codeBlock);
    

    if (event.key === "Enter" && event.shiftKey && codeBlock) {
        event.preventDefault();

        // Insert newline at caret in code block using innerText
        const caret = selection.getRangeAt(0);
        const preCaretRange = caret.cloneRange();
        preCaretRange.selectNodeContents(codeBlock);
        preCaretRange.setEnd(caret.endContainer, caret.endOffset);
        const caretOffset = preCaretRange.toString().length;

        // Get current text
        const text = codeBlock.innerText;
        const newText = text.slice(0, caretOffset) + "\n" + text.slice(caretOffset);

        // Temporarily disable hljs
        codeBlock.textContent = newText;

        // Set caret manually after newline
        requestAnimationFrame(() => {
            const walker = document.createTreeWalker(codeBlock, NodeFilter.SHOW_TEXT, null);
            let offset = caretOffset + 1;
            let found = false;
            while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.length >= offset) {
                const range = document.createRange();
                range.setStart(node, offset);
                range.collapse(true);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                found = true;
                break;
            } else {
                offset -= node.length;
            }
            }

           
            codeBlock.addEventListener('input', () => {
            clearTimeout(highlightTimeout);
            highlightTimeout = setTimeout(() => {
                hljs.highlightElement(codeBlock);
            }, 500);
            });
        });

        return;
        }


  if (event.key === "Enter" && codeBlock) {
    console.log("Enter pressed in code block");
    event.preventDefault();
    const content = codeBlock.textContent.trim();
    const currentLine = range.startContainer.nodeValue?.trim();

    if (!currentLine) {
      event.preventDefault();

      const currentSection = codeBlock.closest('section');
      if (!currentSection) return;

      const hexID = createHashID();
      const newParagraph = createParagraph(hexID);
      const temp = document.createElement('div');
      temp.innerHTML = newParagraph;
      const newP = temp.firstElementChild;

      currentSection.insertBefore(newP, codeBlock.parentElement.nextSibling);

      requestAnimationFrame(() => {
        const newLeaf = newP.querySelector('span[data-slate-leaf="true"]');
        if (newLeaf) {
          const newRange = document.createRange();
          newRange.selectNodeContents(newLeaf);
          newRange.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      });
    }
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const node = selection.anchorNode;
    const leafSpan = node?.nodeType === 3 ? node.parentElement : node;
    if (!leafSpan || !leafSpan.closest('[data-slate-leaf="true"]')) return;

    event.preventDefault();
    const currentP = leafSpan.closest('p[data-slate-node="element"]');
    const currentSection = leafSpan.closest('section');
    if (currentSection) {
      const hexID = createHashID();
      const newParagraph = createParagraph(hexID);
      const temp = document.createElement('div');
      temp.innerHTML = newParagraph;
      const newP = temp.firstElementChild;
      currentSection.insertBefore(newP, currentP?.nextSibling || null);

      requestAnimationFrame(() => {
        const newLeaf = newP.querySelector('span[data-slate-leaf="true"]');
        if (newLeaf) {
          const range = document.createRange();
          range.selectNodeContents(newLeaf);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
    }
  }
});


editor.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('[data-copy-btn]');
  if (!copyBtn) return;

  const code = copyBtn.previousElementSibling;
  if (!code || !code.textContent) return;

  navigator.clipboard.writeText(code.textContent).then(() => {
    copyBtn.classList.add('copied'); 
    setTimeout(() => {
      copyBtn.classList.remove('copied'); 
    }, 2000);
  });
});
