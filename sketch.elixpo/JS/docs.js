hljs.highlightAll();
let enterPressCount = 0;
const editor = document.getElementById('editor');

function highlightCodeBlock(codeElement) {
  if (!codeElement) return;
  try {
    if (codeElement.dataset.highlighted) {
      delete codeElement.dataset.highlighted;
    }
    hljs.highlightElement(codeElement);
  } catch (error) {
    console.warn("Highlight.js error:", error);
  }
}

function getCurrentLineElement() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;

  let node = sel.getRangeAt(0).startContainer;

  while (node && node !== editor) {
    if (node.parentNode === editor) {
      return node;
    }
    if (node.tagName === 'LI') {
      return node;
    }
    if (node.tagName === 'PRE') {
      return node;
    }
    node = node.parentNode;
  }
  return null;
}

function placeCaretAtStart(el) {
  const range = document.createRange();
  const sel = window.getSelection();

  if (el.nodeType === Node.TEXT_NODE) {
    range.setStart(el, 0);
  } else if (el.firstChild) {
    if (el.firstChild.nodeType === Node.TEXT_NODE) {
      range.setStart(el.firstChild, 0);
    } else {
      range.setStartBefore(el.firstChild);
    }
  } else {
    range.setStart(el, 0);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function placeCaretAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function createNewLineElement() {
  const div = document.createElement('div');
  div.appendChild(document.createElement('br'));
  return div;
}

function replaceLine(oldLineEl, newEl, placeCaretStrategy = 'end', caretOffset = 0, currentRange = null) {
  const parent = oldLineEl.parentNode;
  if (parent) {
    parent.replaceChild(newEl, oldLineEl);
  } else {
    editor.appendChild(newEl);
  }

  if (currentRange && currentRange.startContainer && newEl.contains(currentRange.startContainer)) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(currentRange);
  } else if (placeCaretStrategy === 'start') {
    placeCaretAtStart(newEl);
  } else if (placeCaretStrategy === 'end') {
    placeCaretAtEnd(newEl);
  } else if (placeCaretStrategy === 'offset') {
    const range = document.createRange();
    const sel = window.getSelection();
    const textNode = newEl.firstChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, Math.min(caretOffset, textNode.length));
    } else if (newEl.childNodes.length > 0) {
      range.setStart(newEl, 0);
    } else {
      range.setStart(newEl, 0);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function applyBlockStyle(lineEl, tag, pattern, caretOffset = 0) {
  const text = lineEl.textContent;
  const match = text.match(pattern);
  if (!match) return false;

  const newEl = document.createElement(tag);
  newEl.textContent = match[1] || '\u200B';

  const sel = window.getSelection();
  const currentRange = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

  replaceLine(lineEl, newEl, 'offset', caretOffset, currentRange);
  return true;
}

function handleBlockFormatting(lineEl) {
  const text = lineEl.textContent;
  let handled = false;

  if (lineEl.tagName === 'DIV' || lineEl.tagName === 'P') {
    if (text === '```\u00A0') {
      const pre = document.createElement('pre');
      pre.style.cssText = `
        background-color: #242424;
        padding: 15px;
        border-radius: 8px;
        overflow-x: auto;
        font-family: 'lixCode';
        font-size: 0.9em;
        margin: 1em 0;
        line-height: 1.45;
        border: 2px solid #F47067;
        position: relative;
      `;

      const code = document.createElement('code');
      code.className = 'language-plaintext';
      code.setAttribute('contenteditable', 'true');
      code.innerHTML = '';
      code.style.cssText = `
          display: block;
          white-space: pre;
          overflow-x: auto;
          padding-right: 2.5em;
          background: none;
          font-family: 'lixCode';
          padding: 0;
          border-radius: 0;
          color: inherit;
          font-size: inherit;
          min-height: 1.5em;
      `;
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.setAttribute('contenteditable', 'false');
      copyButton.style.position = 'absolute';
      copyButton.style.top = '0.5em';
      copyButton.style.right = '0.5em';
      copyButton.style.zIndex = '2';
      copyButton.innerHTML = "<i class='bx bx-copy'></i>";
      copyButton.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(code.textContent);
        const originalIcon = copyButton.innerHTML;
        copyButton.innerHTML = "<i class='bx bx-check'></i>";
        setTimeout(() => copyButton.innerHTML = originalIcon, 1500);
      };

      pre.appendChild(code);
      pre.appendChild(copyButton);

      replaceLine(lineEl, pre, 'end');
      placeCaretAtEnd(code);
      return true;
    }

    if (text == '---\u00A0' || text === '***\u00A0' || text === '___\u00A0') {
      const hr = document.createElement('hr');
      replaceLine(lineEl, hr, 'none');
      const newDiv = createNewLineElement();
      editor.insertBefore(newDiv, hr.nextSibling);
      placeCaretAtStart(newDiv);
      return true;
    }

    if (applyBlockStyle(lineEl, 'h1', /^#\s(.*)/, 0)) handled = true;
    else if (applyBlockStyle(lineEl, 'h2', /^##\s(.*)/, 0)) handled = true;
    else if (applyBlockStyle(lineEl, 'h3', /^###\s(.*)/, 0)) handled = true;
    else if (applyBlockStyle(lineEl, 'h4', /^####\s(.*)/, 0)) handled = true;
    else if (applyBlockStyle(lineEl, 'h5', /^#####\s(.*)/, 0)) handled = true;
    else if (applyBlockStyle(lineEl, 'h6', /^######\s(.*)/, 0)) handled = true;
    else if (applyBlockStyle(lineEl, 'blockquote', /^>\s(.*)/, 0)) handled = true;

    else if ((text.startsWith('*\u00A0') || text.startsWith('-\u00A0')) && lineEl.tagName === 'DIV') {
      const ul = document.createElement('ul');
      const li = document.createElement('li');
      li.textContent = text.substring(2) || '\u200B';
      ul.appendChild(li);
      replaceLine(lineEl, ul, 'none');
      placeCaretAtEnd(li);
      handled = true;
    }
    else if (text.match(/^(\d+)\.\s(.*)/)) {
      const olMatch = text.match(/^(\d+)\.\s(.*)/);
      const ol = document.createElement('ol');
      const li = document.createElement('li');
      li.textContent = olMatch[2] || '\u200B';
      li.setAttribute('value', parseInt(olMatch[1]));
      ol.appendChild(li);
      replaceLine(lineEl, ol, 'none');
      placeCaretAtEnd(li);
      handled = true;
    }
  }

  return handled;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'");
}

function applyInlineStylesToTextNode(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

    const parent = textNode.parentNode;
    if (!parent || parent.tagName === 'CODE' || parent.tagName === 'PRE') return;

    const originalText = textNode.nodeValue;
    let newHtml = originalText;
    let matchFound = false;

    const styleMap = [
        { regex: /\*\*(.+?)\*\*/g, tag: 'span', className: 'bold' },
        { regex: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, tag: 'span', className: 'italic' },
        { regex: /__(?!_)(.+?)__(?!_)/g, tag: 'span', className: 'underline' },
        { regex: /(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, tag: 'span', className: 'italic' },
        { regex: /~~(.+?)~~/g, tag: 'span', className: 'strike' },
        { regex: /==(.+?)==/g, tag: 'span', className: 'mark' },
        { regex: /`([^`\n]+?)`/g, tag: 'span', className: 'code-inline' }
    ];

    // Convert markers to HTML for all styles
    for (const style of styleMap) {
        newHtml = newHtml.replace(style.regex, (match, p1) => {
            matchFound = true;
            return `<${style.tag} class="${style.className}">${escapeHtml(p1)}</${style.tag}>`;
        });
    }

    if (matchFound) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHtml;

        // Replace the text node with the new HTML content
        while (tempDiv.firstChild) {
            parent.insertBefore(tempDiv.firstChild, textNode);
        }
        parent.removeChild(textNode);
    }
}


function traverseAndApplyInlineStyles(node) {
  if (!node) return;

  if (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'CODE' || node.tagName === 'PRE')) {
    return;
  }

  // Iterate over child nodes. Using Array.from to create a static copy
  // because applyInlineStylesToTextNode might modify the children list.
  const childNodes = Array.from(node.childNodes);
  for (const child of childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      applyInlineStylesToTextNode(child);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      // Recursively apply to child elements unless they are already styled inline elements
      // This prevents re-processing spans that are already part of an inline style
      const styledClasses = ['bold', 'italic', 'underline', 'strike', 'mark', 'code-inline'];
      if (!styledClasses.some(cls => child.classList.contains(cls))) {
        traverseAndApplyInlineStyles(child);
      }
    }
  }
}

function updateCodeBlockClasses(codeElement) {
  if (!codeElement) return;
  const result = hljs.highlightAuto(codeElement.textContent);
  codeElement.className = '';
  if (Array.isArray(result.classes)) {
    result.classes.forEach(cls => codeElement.classList.add(cls));
  }
  codeElement.classList.add('hljs');
}

editor.addEventListener('input', (e) => {
  const sel = window.getSelection();
  const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
  const currentLine = getCurrentLineElement();

  if (!currentLine || !range) return;

  const savedRange = range.cloneRange();

  if (e.inputType === 'insertText' && e.data === ' ') {
    if (handleBlockFormatting(currentLine)) {
      return;
    }
  }

  if (currentLine.tagName !== 'PRE') {
    traverseAndApplyInlineStyles(currentLine);

    try {
      if (sel.rangeCount === 0 || !sel.containsNode(savedRange.startContainer, true)) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    } catch (err) {
      console.warn("Error restoring range after input/styling:", err);
      // Fallback: if range restoration fails, place caret at the end of the current line
      placeCaretAtEnd(currentLine);
    }
  }
  else {
    const codeEl = currentLine.querySelector('code');
    if (codeEl) {
      updateCodeBlockClasses(codeEl);
    }
  }
});

editor.addEventListener('keydown', (e) => {
  const sel = window.getSelection();
  const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
  let currentLine = getCurrentLineElement();

  if(e.key === 'Backspace') {
    if (currentLine && currentLine.tagName !== 'LI') {
      if (currentLine.textContent === '' || currentLine.innerHTML === '<br>') {
        e.preventDefault();
        const newDiv = createNewLineElement();
        editor.replaceChild(newDiv, currentLine);
        placeCaretAtStart(newDiv);
        return;
      }
    }

    if (currentLine && currentLine.tagName === 'DIV' && currentLine.parentElement?.tagName === 'LI' && currentLine.textContent.trim() === '') {
      e.preventDefault();
      const liParent = currentLine.parentElement;

      liParent.removeChild(currentLine);
      if (!liParent.hasChildNodes()) {
          const br = document.createElement('br');
          liParent.appendChild(br);
      }
      placeCaretAtEnd(liParent);
      return;
    }

    if (currentLine && currentLine.tagName === 'LI') {
        const ul = currentLine.parentElement;
        if (!ul || (ul.tagName !== 'UL' && ul.tagName !== 'OL')) return;

        const isEmpty = currentLine.textContent.trim() === '';

        if (isEmpty) {
            e.preventDefault();

            if (ul.parentNode.tagName === 'LI') {
                const parentLi = ul.parentNode;
                ul.remove();
                placeCaretAtEnd(parentLi);
            } else {
                const newDiv = createNewLineElement();
                ul.remove();
                editor.insertBefore(newDiv, ul.nextSibling || null);
                placeCaretAtStart(newDiv);
            }
            return;
        }
    }
  }

  if (currentLine && currentLine.tagName === 'PRE') {
    if (sel) {
      if(e.key === 'Backspace') {
        const codeEl = currentLine.querySelector('code');
        const selectedContent = sel.toString();
        if (codeEl && selectedContent === codeEl.textContent && selectedContent.length > 0) {
          e.preventDefault();
          codeEl.textContent = '';
          placeCaretAtStart(codeEl);
          updateCodeBlockClasses(codeEl);
          return;
        }

        const isCaretAtStart = sel.isCollapsed && sel.anchorOffset === 0 && (sel.anchorNode === codeEl || sel.anchorNode === codeEl.firstChild);
        const isCodeEmpty = codeEl.textContent.trim() === '';
        if (isCaretAtStart && isCodeEmpty) {
            e.preventDefault();
            const newDiv = createNewLineElement();
            editor.replaceChild(newDiv, currentLine);
            placeCaretAtStart(newDiv);
            return;
        }
      }
    }
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    enterPressCount++;

    if (!currentLine) {
      editor.appendChild(createNewLineElement());
      placeCaretAtStart(editor.lastChild);
      return;
    }

    if (currentLine.tagName === 'LI') {
      const parentList = currentLine.parentNode;
      const isCaretAtStartOfLi = range.startOffset === 0 && range.startContainer === currentLine.firstChild;
      const isLiEmpty = currentLine.textContent.trim() === '' && !currentLine.querySelector('br');

      if (isLiEmpty) {
        if (enterPressCount >= 2 || (isCaretAtStartOfLi && !currentLine.previousElementSibling)) {
          const newDiv = createNewLineElement();
          parentList.removeChild(currentLine);
          if (parentList.children.length === 0) {
            if (parentList.parentNode.tagName === 'LI') {
              const grandParentLi = parentList.parentNode;
              parentList.remove();
              editor.insertBefore(newDiv, grandParentLi.nextSibling || null);
              placeCaretAtStart(newDiv);
            } else {
              parentList.remove();
              editor.insertBefore(newDiv, parentList.nextSibling || null);
              placeCaretAtStart(newDiv);
            }
          } else {
            const next = currentLine.nextElementSibling;
            const prev = currentLine.previousElementSibling;
            if (next) placeCaretAtStart(next);
            else if (prev) placeCaretAtEnd(prev);
            else placeCaretAtStart(parentList.children[0]);
          }
          enterPressCount = 0;
        } else {
          const nextSibling = currentLine.nextElementSibling;
          if (nextSibling && nextSibling.tagName === 'LI') {
            parentList.removeChild(currentLine);
            placeCaretAtStart(nextSibling);
          } else {
            const newDiv = createNewLineElement();
            parentList.removeChild(currentLine);
            if (parentList.children.length === 0) {
              parentList.remove();
            }
            editor.insertBefore(newDiv, parentList.nextSibling || null);
            placeCaretAtStart(newDiv);
          }
          enterPressCount = 0;
        }
      } else {
        const newLi = document.createElement('li');
        const remainingContents = range.extractContents();
        if (remainingContents.hasChildNodes()) {
          newLi.appendChild(remainingContents);
        } else {
          newLi.appendChild(document.createElement('br'));
        }
        currentLine.parentNode.insertBefore(newLi, currentLine.nextSibling);
        placeCaretAtStart(newLi);
        enterPressCount = 0;
      }
    }
    else if (currentLine.tagName === 'PRE') {
      const codeEl = currentLine.querySelector('code');
      if (codeEl) {
        if (e.shiftKey) {
          e.preventDefault();
          const range = sel.getRangeAt(0);
          const textNode = document.createTextNode('\n');
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          sel.removeAllRanges();
          sel.addRange(range);
          updateCodeBlockClasses(codeEl);
        } else {
          e.preventDefault();
          if (codeEl.textContent.trim() === '') {
            const newDiv = createNewLineElement();
            editor.replaceChild(newDiv, currentLine);
            placeCaretAtStart(newDiv);
          } else {
            const newDiv = createNewLineElement();
            editor.insertBefore(newDiv, currentLine.nextSibling);
            placeCaretAtStart(newDiv);
          }
        }
      }
    } else {
      if (currentLine.textContent.trim() === '' && currentLine.tagName !== 'DIV') {
        const newDiv = createNewLineElement();
        editor.replaceChild(newDiv, currentLine);
        placeCaretAtStart(newDiv);
      } else {
        const newDiv = createNewLineElement();
        const remainingContents = range.extractContents();
        if (remainingContents.hasChildNodes()) {
          newDiv.appendChild(remainingContents);
        }

        editor.insertBefore(newDiv, currentLine.nextSibling);
        placeCaretAtStart(newDiv);
      }
      enterPressCount = 0;
    }
  }

  else if (e.key === 'Tab') {
    e.preventDefault();
    if (currentLine && currentLine.tagName === 'LI') {
      const parentList = currentLine.parentNode;
      const previousSibling = currentLine.previousElementSibling;

      if (previousSibling && previousSibling.tagName === 'LI') {
        let nestedList;
        if (previousSibling.lastElementChild && (previousSibling.lastElementChild.tagName === 'UL' || previousSibling.lastElementChild.tagName === 'OL')) {
          nestedList = previousSibling.lastElementChild;
        } else {
          nestedList = document.createElement(parentList.tagName);
          previousSibling.appendChild(nestedList);
        }
        nestedList.appendChild(currentLine);
        placeCaretAtEnd(currentLine);
      }
    } else if (currentLine && currentLine.tagName === 'PRE') {
      const textNode = document.createTextNode('  ');
      range.insertNode(textNode);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      highlightCodeBlock(currentLine.querySelector('code'));
    } else {
      const spaceNode = document.createTextNode('  ');
      range.insertNode(spaceNode);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } else if (e.key === 'Backspace') {
    enterPressCount = 0;
    const sel = window.getSelection();
    if (sel.isCollapsed && sel.anchorOffset === 0) {
      const currentLineElement = getCurrentLineElement();
      if (!currentLineElement) return;

      if (currentLineElement.tagName !== 'DIV' && currentLineElement.tagName !== 'LI' && currentLineElement.tagName !== 'PRE' && currentLineElement.previousElementSibling) {
        e.preventDefault();
        const newDiv = createNewLineElement();
        newDiv.innerHTML = currentLineElement.innerHTML;
        const prevSibling = currentLineElement.previousElementSibling;

        editor.replaceChild(newDiv, currentLineElement);
        if (prevSibling) {
          placeCaretAtEnd(prevSibling);
        } else {
          placeCaretAtStart(newDiv);
        }
      }
      else if (currentLineElement.tagName === 'LI' && !currentLineElement.previousElementSibling && currentLineElement.parentNode.parentNode === editor) {
        e.preventDefault();
        const parentList = currentLineElement.parentNode;
        const newDiv = createNewLineElement();
        newDiv.innerHTML = currentLineElement.innerHTML;
        parentList.removeChild(currentLineElement);
        if (parentList.children.length === 0) {
          parentList.remove();
        }
        editor.insertBefore(newDiv, parentList.nextSibling || parentList);
        placeCaretAtEnd(newDiv);
      }
      else if (currentLineElement.tagName === 'PRE' && currentLineElement.textContent.trim() === '') {
        e.preventDefault();
        const newDiv = createNewLineElement();
        editor.replaceChild(newDiv, currentLineElement);
        placeCaretAtStart(newDiv);
      }
    }
  } else {
    enterPressCount = 0;
  }
});

editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && e.shiftKey) {
    e.preventDefault();
    const currentLi = getCurrentLineElement();
    if (currentLi && currentLi.tagName === 'LI') {
      const parentList = currentLi.parentNode;
      const grandParentLi = parentList.parentNode;

      if (grandParentLi && grandParentLi.tagName === 'LI') {
        grandParentLi.parentNode.insertBefore(currentLi, grandParentLi.nextSibling);
        if (parentList.children.length === 0) {
          parentList.remove();
        }
        placeCaretAtEnd(currentLi);
      } else if (parentList.parentNode === editor) {
        const newDiv = document.createElement('div');
        newDiv.innerHTML = currentLi.innerHTML;
        editor.insertBefore(newDiv, parentList.nextSibling || parentList);
        parentList.removeChild(currentLi);
        if (parentList.children.length === 0) {
          parentList.remove();
        }
        placeCaretAtEnd(newDiv);
      }
    }
  }
});

editor.addEventListener('click', (e) => {
  const clickedElement = e.target;

  if (clickedElement.tagName === 'PRE' || clickedElement.tagName === 'CODE') {
    const codeEl = clickedElement.tagName === 'CODE' ? clickedElement : clickedElement.querySelector('code');
    if (codeEl) {
      setTimeout(() => {
        codeEl.focus();
        if (codeEl.textContent === '') {
          placeCaretAtStart(codeEl);
        }
      }, 0);
    }
  }
});

if (editor.children.length === 0 || editor.textContent.trim() === '') {
  editor.appendChild(createNewLineElement());
}
if (editor.firstChild && editor.firstChild.firstChild) {
  placeCaretAtStart(editor.firstChild.firstChild);
} else {
  placeCaretAtStart(editor.firstChild);
}