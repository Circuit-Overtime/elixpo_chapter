const vscode = require('vscode');
const path = require('path');

class LixSketchEditorProvider {
    constructor(context) {
        this.context = context;
    }

    resolveCustomTextEditor(document, webviewPanel, _token) {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
            ],
        };

        webviewPanel.webview.html = this._getWebviewContent(webviewPanel.webview);

        // Track if we're currently applying an edit from the webview
        let isApplyingEdit = false;

        // When webview sends a message
        webviewPanel.webview.onDidReceiveMessage((msg) => {
            switch (msg.type) {
                case 'ready':
                    // Send current document content to webview
                    const text = document.getText();
                    webviewPanel.webview.postMessage({
                        type: 'load',
                        content: text || '{}',
                    });
                    break;

                case 'update':
                    // Apply the updated scene to the VS Code document
                    if (msg.content) {
                        isApplyingEdit = true;
                        const edit = new vscode.WorkspaceEdit();
                        edit.replace(
                            document.uri,
                            new vscode.Range(0, 0, document.lineCount, 0),
                            msg.content
                        );
                        vscode.workspace.applyEdit(edit).then(() => {
                            isApplyingEdit = false;
                        });
                    }
                    break;
            }
        });

        // When document changes externally (e.g. git checkout, another editor)
        const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() === document.uri.toString() && !isApplyingEdit) {
                webviewPanel.webview.postMessage({
                    type: 'load',
                    content: document.getText(),
                });
            }
        });

        webviewPanel.onDidDispose(() => {
            changeSubscription.dispose();
        });
    }

    _getWebviewContent(webview) {
        const engineUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'engine.bundle.js'))
        );
        const toolbarCssUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'toolbar.css'))
        );
        const webviewJsUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'webview.js'))
        );
        const fontsUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'fonts.css'))
        );

        const nonce = getNonce();

        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   img-src ${webview.cspSource} data: blob:;
                   style-src ${webview.cspSource} 'unsafe-inline';
                   font-src ${webview.cspSource};
                   script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${fontsUri}">
    <link rel="stylesheet" href="${toolbarCssUri}">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #13171C; }
        #canvas-svg {
            width: 100vw;
            height: 100vh;
            display: block;
            touch-action: none;
        }
    </style>
</head>
<body>
    <div id="toolbar">
        <button class="tool-btn active" data-tool="select" title="Select (V)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
        </button>
        <button class="tool-btn" data-tool="pan" title="Pan (H)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 00-4 0v6M14 10V4a2 2 0 00-4 0v7M10 10.5V5a2 2 0 00-4 0v9"/><path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-3.5-.5-5.5-2.5L4.2 17a2 2 0 012.8-2.8L10 17"/></svg>
        </button>
        <div class="tool-divider"></div>
        <button class="tool-btn" data-tool="rectangle" title="Rectangle (R)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>
        <button class="tool-btn" data-tool="circle" title="Circle (C)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
        </button>
        <button class="tool-btn" data-tool="arrow" title="Arrow (A)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
        <button class="tool-btn" data-tool="line" title="Line (L)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>
        </button>
        <button class="tool-btn" data-tool="text" title="Text (T)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9.5" y1="20" x2="14.5" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
        </button>
        <button class="tool-btn" data-tool="freehand" title="Draw (D)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
        </button>
        <button class="tool-btn" data-tool="eraser" title="Eraser (E)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.8 1.4c.8-.8 2-.8 2.8 0l5 5c.8.8.8 2 0 2.8L11 20"/><path d="M6 11l7 7"/></svg>
        </button>
        <button class="tool-btn" data-tool="frame" title="Frame (F)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="0" stroke-dasharray="4 2"/></svg>
        </button>
        <div class="tool-divider"></div>
        <div id="zoom-controls">
            <button id="zoomOut" title="Zoom Out">-</button>
            <span id="zoomPercent">100%</span>
            <button id="zoomIn" title="Zoom In">+</button>
        </div>
    </div>

    <svg id="canvas-svg"
         xmlns="http://www.w3.org/2000/svg"
         width="100%"
         height="100%">
    </svg>

    <script nonce="${nonce}" src="${engineUri}"></script>
    <script nonce="${nonce}" src="${webviewJsUri}"></script>
</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}

module.exports = { LixSketchEditorProvider };
