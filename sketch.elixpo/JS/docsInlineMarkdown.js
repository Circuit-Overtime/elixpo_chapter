


function processMarkdownInText(text, parentNode, replaceNode = null) {
  if (!text || !hasMarkdownPattern(text)) return { addedTrailingSpan: false };

  const allMatches = [];
  for (let i = 0; i < stylePatterns.length; i++) {
    const pattern = stylePatterns[i];
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(text)) !== null) {
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        fullMatch: match[0],
        content: match[1],
        tag: pattern.tag,
        className: pattern.className,
        priority: i
      });
    }
  }

  if (allMatches.length === 0) {
    if (!parentNode.querySelector('span.default-text')) {
      const defaultSpan = document.createElement('span');
      defaultSpan.className = 'default-text';
      defaultSpan.id = `span_${generateHexID()}`;
      defaultSpan.textContent = text;
      parentNode.innerHTML = '';
      parentNode.appendChild(defaultSpan);
    }
    return { addedTrailingSpan: false };
  }

  allMatches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return a.priority - b.priority;
  });

  const validMatches = [];
  for (const match of allMatches) {
    const hasOverlap = validMatches.some(existing =>
      (match.start < existing.end && match.end > existing.start) ||
      (match.start >= existing.start && match.end <= existing.end) ||
      (existing.start >= match.start && existing.end <= match.end)
    );
    if (!hasOverlap) {
      validMatches.push(match);
    }
  }

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let insertedTrailingSpan = null;

  for (const match of validMatches) {
    if (match.start > lastIndex) {
      const beforeText = text.substring(lastIndex, match.start);
      if (beforeText) {
        const defaultSpan = document.createElement('span');
        defaultSpan.className = 'default-text';
        defaultSpan.id = `span_${generateHexID()}`;
        defaultSpan.textContent = beforeText;
        fragment.appendChild(defaultSpan);
      }
    }

    const styledSpan = document.createElement(match.tag);
    styledSpan.className = match.className;
    styledSpan.id = `span_${generateHexID()}`;
    styledSpan.textContent = match.content;
    fragment.appendChild(styledSpan);

    lastIndex = match.end;
  }

  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    const remainingSpan = document.createElement('span');
    remainingSpan.className = 'default-text';
    remainingSpan.id = `span_${generateHexID()}`;
    remainingSpan.textContent = remainingText;
    fragment.appendChild(remainingSpan);
  }

  const trailingSpan = document.createElement('span');
  trailingSpan.className = 'default-text';
  trailingSpan.id = `span_${generateHexID()}`;
  trailingSpan.textContent = '\u00A0  '; 
  fragment.appendChild(trailingSpan);
  insertedTrailingSpan = trailingSpan;

  if (replaceNode) {
    parentNode.insertBefore(fragment, replaceNode);
    parentNode.removeChild(replaceNode);
  } else {
    parentNode.innerHTML = '';
    parentNode.appendChild(fragment);
  }

  
  if (insertedTrailingSpan?.firstChild?.nodeType === Node.TEXT_NODE) {
    setTimeout(() => {
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(insertedTrailingSpan.firstChild, insertedTrailingSpan.firstChild.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }, 0);
  }

  return { addedTrailingSpan: true };
}

function processEntireLineContent(node) {
  if (node.querySelector('.default-text-not-editable')) {
    return { addedTrailingSpan: false };
  }

  const lineText = node.textContent;
  if (!lineText) {
    if (!node.querySelector('span.default-text')) {
      node.innerHTML = '';
      const defaultSpan = document.createElement('span');
      defaultSpan.className = 'default-text';
      defaultSpan.innerHTML = '\u00A0';
      node.appendChild(defaultSpan);
    }
    return { addedTrailingSpan: false };
  }

  return processMarkdownInText(lineText, node);
}