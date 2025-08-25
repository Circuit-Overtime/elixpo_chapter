// Constants
const SERVER_URL = "http://127.0.0.1:5000";

// DOM elements
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const plusBtn = document.getElementById('plusBtn');
const plusMenu = document.getElementById('plusMenu');
const conversation = document.getElementById('conversation');
const initialTitle = document.querySelector('.initial-title');

// State
let isGenerating = false;
let isDeepResearch = false;

// Initialize app
function init() {
    console.log('Initializing interface...');
    
    // Ensure all elements exist
    if (!messageInput || !sendBtn || !plusBtn || !plusMenu || !conversation || !initialTitle) {
        console.error('Required DOM elements not found');
        return;
    }
    
    // Event listeners
    sendBtn.addEventListener('click', handleSend);
    plusBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        togglePlusMenu();
    });
    
    messageInput.addEventListener('input', function() {
        updateSendButton();
        autoResize();
    });
    
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
    
    // Menu item clicks
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const action = this.getAttribute('data-action');
            handleMenuAction(action);
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!plusBtn.contains(e.target) && !plusMenu.contains(e.target)) {
            closePlusMenu();
        }
    });
    
    updateSendButton();
    console.log('App initialized successfully');
}

// Toggle plus menu
function togglePlusMenu() {
    console.log('Toggling plus menu');
    if (plusMenu.classList.contains('hidden')) {
        plusMenu.classList.remove('hidden');
        console.log('Menu opened');
    } else {
        plusMenu.classList.add('hidden');
        console.log('Menu closed');
    }
}

// Close plus menu
function closePlusMenu() {
    plusMenu.classList.add('hidden');
}

// Handle menu actions
function handleMenuAction(action) {
    console.log('Menu action:', action);
    closePlusMenu();
    
    if (action === 'deep_research') {
        isDeepResearch = true;
        messageInput.placeholder = "Ask for deep research...";
        messageInput.focus();
        console.log('Deep research mode enabled');
    } else {
        isDeepResearch = false;
        messageInput.placeholder = "Message ChatGPT";
        messageInput.focus();
        console.log('Action selected:', action);
    }
}

// Auto resize textarea
function autoResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
}

// Update send button state
function updateSendButton() {
    const hasText = messageInput.value.trim().length > 0;
    sendBtn.disabled = !hasText || isGenerating;
}

// Add streaming section and final markdown message
function addStreamingMessage(role, stream = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + role;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'Y' : 'AI';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    let streamingDiv = null;
    let finalDiv = null;

    if (role === 'assistant' && stream) {
        streamingDiv = document.createElement('div');
        streamingDiv.className = 'streaming-section loading';
        streamingDiv.id = 'streaming-section-' + Date.now();
        streamingDiv.textContent = '';
        messageContent.appendChild(streamingDiv);

        finalDiv = document.createElement('div');
        finalDiv.className = 'final-markdown';
        finalDiv.style.display = 'none';
        messageContent.appendChild(finalDiv);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        conversation.appendChild(messageDiv);

        scrollToBottom();
        return {streamingDiv, finalDiv, messageDiv};
    } else {
        messageContent.textContent = '';
        if (role === 'user') {
            messageDiv.appendChild(messageContent);
            messageDiv.appendChild(avatar);
        } else {
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(messageContent);
        }
        conversation.appendChild(messageDiv);
        scrollToBottom();
        return {messageContent, messageDiv};
    }
}

function streamAssistantResponse(message, deepResearch) {
    const { streamingDiv, finalDiv } = addStreamingMessage('assistant', true);

    const payload = {
        stream: true,
        messages: [{
            role: "user",
            content: [{ type: "text", text: message }]
        }],
        deep: deepResearch || false
    };

    fetch(SERVER_URL + '/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(async response => {
        if (!response.ok) throw new Error('Server responded with ' + response.status);

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/event-stream')) {
            // --- SSE Streaming ---
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let finalText = '';
            streamingDiv.style.display = 'block';
            streamingDiv.classList.add('loading');
            streamingDiv.textContent = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let parts = buffer.split('\n\n');
                buffer = parts.pop();
                for (let part of parts) {
                    if (!part.trim()) continue;
                    if (part.startsWith('data:')) {
                        let jsonStr = part.replace(/^data:\s*/, '');
                        if (jsonStr === '[DONE]') continue;
                        try {
                            let chunk = JSON.parse(jsonStr);
                            let content = chunk?.choices?.[0]?.delta?.content || '';
                            // Show <TASK> lines in streamingDiv, rest in final markdown
                            if (content) {
                                const { taskLines, restText } = extractTaskLines(content);
                                if (taskLines.length > 0) {
                                    for (let line of taskLines) {
                                        let lineDiv = document.createElement('div');
                                        lineDiv.textContent = line;
                                        streamingDiv.appendChild(lineDiv);
                                    }
                                }
                                finalText += restText;
                                scrollToBottom();
                            }
                            // If finish_reason is stop, show final markdown
                            if (chunk?.choices?.[0]?.finish_reason === 'stop') {
                                streamingDiv.classList.remove('loading');
                                streamingDiv.style.display = 'none';
                                finalDiv.style.display = 'block';
                                finalDiv.innerHTML = renderMarkdown(finalText);
                                scrollToBottom();
                                isGenerating = false;
                                updateSendButton();
                            }
                        } catch (e) {
                            // ignore parse errors
                        }
                    }
                }
            }
            if (finalDiv.style.display === 'none') {
                streamingDiv.classList.remove('loading');
                streamingDiv.style.display = 'none';
                finalDiv.style.display = 'block';
                finalDiv.innerHTML = renderMarkdown(finalText);
                scrollToBottom();
                isGenerating = false;
                updateSendButton();
            }
        } else {
            // --- Fallback: JSON response ---
            const data = await response.json();
            streamingDiv.classList.remove('loading');
            streamingDiv.style.display = 'none';
            finalDiv.style.display = 'block';
            let responseText = '';
            if (data.error) {
                responseText = 'Error: ' + data.error;
            } else if (data.result) {
                responseText = data.result;
            } else if (data.choices && data.choices[0] && data.choices[0].message) {
                responseText = data.choices[0].message.content;
            } else {
                responseText = "I received your message but couldn't generate a proper response.";
            }
            // Remove <TASK> blocks from final message
            const { restText } = extractTaskLines(responseText);
            finalDiv.innerHTML = renderMarkdown(restText);
            scrollToBottom();
            isGenerating = false;
            updateSendButton();
        }
    }).catch(error => {
        streamingDiv.classList.remove('loading');
        streamingDiv.style.display = 'none';
        finalDiv.style.display = 'block';
        finalDiv.innerHTML = "<span style='color:#f87171'>An error occurred! Please try again later.</span>";
        scrollToBottom();
        isGenerating = false;
        updateSendButton();
    });
}



function extractTaskLines(text) {
    let taskLines = [];
    let restText = text;
    const taskRegex = /<TASK>([\s\S]*?)<\/TASK>/gi;
    let match;
    while ((match = taskRegex.exec(text)) !== null) {
        // Split the content inside <TASK> by newlines, trim, and add to array
        let lines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
        taskLines.push(...lines);
        // Remove this <TASK>...</TASK> from restText
        restText = restText.replace(match[0], '');
    }
    return { taskLines, restText: restText.trim() };
}

function renderMarkdown(text) {
    // Simple replacements for demo; use a real markdown parser for production
    return text
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^(#+)\s*(.*)$/gm, (m, hashes, title) => {
            const level = Math.min(hashes.length, 4);
            return `<h${level}>${title}</h${level}>`;
        })
        .replace(/\n/g, '<br>');
}

// Handle send message (update to use streaming)
function handleSend() {
    const message = messageInput.value.trim();

    if (!message || isGenerating) {
        console.log('Cannot send: empty message or generating');
        return;
    }

    console.log('Sending message:', message);

    // Hide initial title on first message
    if (!initialTitle.classList.contains('hidden')) {
        initialTitle.classList.add('hidden');
    }

    // Add user message
    addMessage('user', message);

    // Clear input
    messageInput.value = '';
    autoResize();
    updateSendButton();
    closePlusMenu();

    // Show typing indicator (optional, can remove if streaming)
    // showTypingIndicator();

    // Send to backend with streaming
    isGenerating = true;
    updateSendButton();
    streamAssistantResponse(message, isDeepResearch);

    // Reset deep research flag
    if (isDeepResearch) {
        isDeepResearch = false;
        messageInput.placeholder = "Message ChatGPT";
    }
}

// Replace addMessage for user only (assistant handled by streaming)
function addMessage(role, content) {
    if (role === 'user') {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'Y';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;

        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(avatar);

        conversation.appendChild(messageDiv);
        scrollToBottom();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}



async function uploadImageToUguu(file) {
    if (!file) {
        notify("No file provided for upload.", false);
        console.error("Upload Error: No file provided.");
        return null; // Indicate failure
    }


    notify("Processing Media, just a min", false);
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`https://imgelixpo.vercel.app/upload-to-uguu`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) {
            // Attempt to read the response body, which might contain an error message from your backend
            const errorData = await res.json().catch(() => ({ error: `HTTP error: ${res.status} ${res.statusText}` }));
            const errorMessage = errorData.error || `Upload failed with status: ${res.status}`;
            console.error('Upload failed at backend endpoint:', errorMessage);
            notify(`Failed to process image!: ${errorMessage}`, false); // Notify user about the failure
            return null; // Indicate failure
        }

        // If the response status is OK, parse the JSON body
        const data = await res.json();
        console.log('Response from backend upload endpoint:', data);

        // Your backend returns { url: "..." } on success
        if (data && data.url) {
            notify("Image uploaded successfully!"); // Notify user about success
            console.log("Image uploaded via backend, Uguu URL:", data.url);
            return data.url; // Return the final Uguu URL received from your backend
        } else {
            // Handle cases where the backend returned 200 OK but the body was not as expected
            console.error('Upload succeeded according to status, but invalid response body from backend:', data);
            notify("Upload failed: Invalid response from server.", false);
            return null; // Indicate failure
        }
    } catch (e) {
        // Catch network errors (e.g., server is down) or errors during response processing (e.g., JSON parsing failed unexpectedly)
        console.error('Error during image upload process:', e);
        notify(`Failed to upload image: ${e.message || 'Network or server error'}`, false); // Notify user about the failure
        return null; // Indicate failure
    }
}

function setupPhotoUpload() {
    // Find the Add photo menu item
    const addPhotoItem = document.querySelector('.menu-item[data-action="file_upload"]');
    if (!addPhotoItem) return;

    // Create a hidden file input for image capture
    let fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment'; // Prefer back camera on mobile
    fileInput.style.display = 'none';

    document.body.appendChild(fileInput);

    addPhotoItem.addEventListener('click', function(e) {
        e.preventDefault();
        fileInput.value = ''; // Reset so same file can be picked again
        fileInput.click();
    });

    fileInput.addEventListener('change', async function(e) {
        const file = fileInput.files[0];
        if (!file) return;

        // Check file size (<3MB)
        if (file.size > 3 * 1024 * 1024) {
            notify("Image must be less than 3MB.", false);
            return;
        }

        // Show preview in search bar
        const reader = new FileReader();
        reader.onload = function(ev) {
            showImagePreview(ev.target.result);
        };
        reader.readAsDataURL(file);

        // Upload to Uguu
        const imageUrl = await uploadImageToUguu(file);
        if (!imageUrl) return;

        // Show image with user query in chat
        let query = messageInput.value.trim();
        addUserMessageWithImage(query, imageUrl);

        // Send to backend as OpenAI-style message
        isGenerating = true;
        updateSendButton();
        streamAssistantResponseWithImage(query, imageUrl, isDeepResearch);

        // Clear input and preview
        messageInput.value = '';
        removeImagePreview();
        autoResize();
        updateSendButton();
        closePlusMenu();
    });
}

function showImagePreview(dataUrl) {
    removeImagePreview();
    const preview = document.createElement('img');
    preview.src = dataUrl;
    preview.className = 'image-url-preview';
    preview.style.maxHeight = '40px';
    preview.style.marginRight = '8px';
    preview.style.verticalAlign = 'middle';
    preview.id = 'search-bar-image-preview';
    messageInput.parentNode.insertBefore(preview, messageInput);
}

// Remove image preview if exists
function removeImagePreview() {
    const prev = document.getElementById('search-bar-image-preview');
    if (prev) prev.remove();
}


function scrollToBottom() {
    conversation.scrollTop = conversation.scrollHeight;
}