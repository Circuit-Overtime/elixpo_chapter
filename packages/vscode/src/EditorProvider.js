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

                case 'info':
                    vscode.window.showInformationMessage(msg.text || '');
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
        const mediaUri = (file) => webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'media', file))
        );

        const engineUri = mediaUri('engine.bundle.js');
        const webviewJsUri = mediaUri('webview.js');
        const fontsUri = mediaUri('fonts.css');
        const toolbarCssUri = mediaUri('toolbar.css');
        const nonce = getNonce();

        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   img-src ${webview.cspSource} data: blob: https:;
                   style-src ${webview.cspSource} 'unsafe-inline' https://unpkg.com;
                   font-src ${webview.cspSource} https://unpkg.com;
                   script-src 'nonce-${nonce}' https://unpkg.com;
                   connect-src https://unpkg.com;">
    <link rel="stylesheet" href="${fontsUri}">
    <link rel="stylesheet" href="${toolbarCssUri}">
    <link rel="stylesheet" href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css">
</head>
<body>
    <!-- ═══════════ TOOLBAR (left vertical bar) ═══════════ -->
    <div id="toolbar">
        <!-- Tool lock -->
        <button class="tool-btn tool-lock" data-action="toollock" title="Tool Lock (Q)">
            <i class="bx bx-lock-alt"></i>
            <span class="tool-key">Q</span>
        </button>

        <div class="tool-divider"></div>

        <!-- Navigation tools -->
        <button class="tool-btn" data-tool="pan" title="Pan (H)">
            <i class="bx bxs-hand"></i>
            <span class="tool-key">H</span>
        </button>
        <button class="tool-btn active" data-tool="select" title="Select (V)">
            <i class="bx bxs-pointer"></i>
            <span class="tool-key">V</span>
        </button>

        <div class="tool-divider"></div>

        <!-- Shape tools -->
        <button class="tool-btn" data-tool="rectangle" title="Rectangle (R)">
            <i class="bx bx-square"></i>
            <span class="tool-key">R</span>
        </button>
        <button class="tool-btn" data-tool="circle" title="Circle (O)">
            <i class="bx bx-circle"></i>
            <span class="tool-key">O</span>
        </button>
        <button class="tool-btn" data-tool="line" title="Line (L)">
            <i class="bx bx-minus"></i>
            <span class="tool-key">L</span>
        </button>
        <button class="tool-btn" data-tool="arrow" title="Arrow (A)">
            <i class="bx bx-right-arrow-alt" style="transform: rotate(-45deg)"></i>
            <span class="tool-key">A</span>
        </button>
        <button class="tool-btn" data-tool="text" title="Text (T)">
            <i class="bx bx-text"></i>
            <span class="tool-key">T</span>
        </button>
        <button class="tool-btn" data-tool="freehand" title="Draw (P)">
            <i class="bx bx-pen"></i>
            <span class="tool-key">P</span>
        </button>
        <button class="tool-btn" data-tool="image" title="Image (9)">
            <i class="bx bx-image-alt"></i>
            <span class="tool-key">9</span>
        </button>

        <div class="tool-divider"></div>

        <!-- Utility tools -->
        <button class="tool-btn" data-tool="frame" title="Frame (F)">
            <i class="bx bx-crop"></i>
            <span class="tool-key">F</span>
        </button>
        <button class="tool-btn" data-tool="laser" title="Laser (K)">
            <i class="bx bxs-magic-wand"></i>
            <span class="tool-key">K</span>
        </button>
        <button class="tool-btn" data-tool="eraser" title="Eraser (E)">
            <i class="bx bxs-eraser"></i>
            <span class="tool-key">E</span>
        </button>
    </div>

    <!-- ═══════════ SIDEBARS (bottom center, per tool) ═══════════ -->

    <!-- Rectangle Sidebar -->
    <div id="sidebar-rectangle" class="sidebar" style="display:none">
        <div class="sidebar-section">
            <div class="sidebar-label">Stroke</div>
            <div class="color-grid" data-prop="stroke">
                <button class="color-swatch active" data-value="#fff" style="background:#fff" title="White"></button>
                <button class="color-swatch" data-value="#FF8383" style="background:#FF8383" title="Red"></button>
                <button class="color-swatch" data-value="#3A994C" style="background:#3A994C" title="Green"></button>
                <button class="color-swatch" data-value="#56A2E8" style="background:#56A2E8" title="Blue"></button>
                <button class="color-swatch" data-value="#FFD700" style="background:#FFD700" title="Gold"></button>
                <button class="color-swatch" data-value="#FF69B4" style="background:#FF69B4" title="Pink"></button>
                <button class="color-swatch" data-value="#A855F7" style="background:#A855F7" title="Purple"></button>
            </div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-label">Fill</div>
            <div class="color-grid" data-prop="fill">
                <button class="color-swatch active" data-value="transparent" title="None">
                    <svg width="14" height="14" viewBox="0 0 14 14"><line x1="0" y1="14" x2="14" y2="0" stroke="#666" stroke-width="1.5"/></svg>
                </button>
                <button class="color-swatch" data-value="#fff" style="background:#fff" title="White"></button>
                <button class="color-swatch" data-value="#FF8383" style="background:#FF8383" title="Red"></button>
                <button class="color-swatch" data-value="#3A994C" style="background:#3A994C" title="Green"></button>
                <button class="color-swatch" data-value="#56A2E8" style="background:#56A2E8" title="Blue"></button>
                <button class="color-swatch" data-value="#FFD700" style="background:#FFD700" title="Gold"></button>
                <button class="color-swatch" data-value="#FF69B4" style="background:#FF69B4" title="Pink"></button>
                <button class="color-swatch" data-value="#A855F7" style="background:#A855F7" title="Purple"></button>
            </div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-label">Width</div>
            <div class="btn-group" data-prop="strokeWidth">
                <button class="group-btn active" data-value="2">2</button>
                <button class="group-btn" data-value="4">4</button>
                <button class="group-btn" data-value="7">7</button>
            </div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-label">Style</div>
            <div class="btn-group" data-prop="strokeStyle">
                <button class="group-btn active" data-value="solid" title="Solid">
                    <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="currentColor" stroke-width="2"/></svg>
                </button>
                <button class="group-btn" data-value="dashed" title="Dashed">
                    <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/></svg>
                </button>
                <button class="group-btn" data-value="dotted" title="Dotted">
                    <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2"/></svg>
                </button>
            </div>
        </div>
        <div class="sidebar-section sidebar-layers">
            <button class="layer-btn" data-action="sendToBack" title="Send to back"><i class="bx bx-chevrons-down"></i></button>
            <button class="layer-btn" data-action="sendBackward" title="Send backward"><i class="bx bx-chevron-down"></i></button>
            <button class="layer-btn" data-action="bringForward" title="Bring forward"><i class="bx bx-chevron-up"></i></button>
            <button class="layer-btn" data-action="bringToFront" title="Bring to front"><i class="bx bx-chevrons-up"></i></button>
        </div>
    </div>

    <!-- Circle Sidebar (same as rectangle) -->
    <div id="sidebar-circle" class="sidebar" style="display:none">
        <div class="sidebar-section">
            <div class="sidebar-label">Stroke</div>
            <div class="color-grid" data-prop="stroke">
                <button class="color-swatch active" data-value="#fff" style="background:#fff" title="White"></button>
                <button class="color-swatch" data-value="#FF8383" style="background:#FF8383" title="Red"></button>
                <button class="color-swatch" data-value="#3A994C" style="background:#3A994C" title="Green"></button>
                <button class="color-swatch" data-value="#56A2E8" style="background:#56A2E8" title="Blue"></button>
                <button class="color-swatch" data-value="#FFD700" style="background:#FFD700" title="Gold"></button>
                <button class="color-swatch" data-value="#FF69B4" style="background:#FF69B4" title="Pink"></button>
                <button class="color-swatch" data-value="#A855F7" style="background:#A855F7" title="Purple"></button>
            </div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-label">Fill</div>
            <div class="color-grid" data-prop="fill">
                <button class="color-swatch active" data-value="transparent" title="None">
                    <svg width="14" height="14" viewBox="0 0 14 14"><line x1="0" y1="14" x2="14" y2="0" stroke="#666" stroke-width="1.5"/></svg>
                </button>
                <button class="color-swatch" data-value="#fff" style="background:#fff" title="White"></button>
                <button class="color-swatch" data-value="#FF8383" style="background:#FF8383" title="Red"></button>
                <button class="color-swatch" data-value="#3A994C" style="background:#3A994C" title="Green"></button>
                <button class="color-swatch" data-value="#56A2E8" style="background:#56A2E8" title="Blue"></button>
                <button class="color-swatch" data-value="#FFD700" style="background:#FFD700" title="Gold"></button>
                <button class="color-swatch" data-value="#FF69B4" style="background:#FF69B4" title="Pink"></button>
                <button class="color-swatch" data-value="#A855F7" style="background:#A855F7" title="Purple"></button>
            </div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-label">Width</div>
            <div class="btn-group" data-prop="strokeWidth">
                <button class="group-btn active" data-value="2">2</button>
                <button class="group-btn" data-value="4">4</button>
                <button class="group-btn" data-value="7">7</button>
            </div>
        </div>
        <div class="sidebar-section sidebar-layers">
            <button class="layer-btn" data-action="sendToBack" title="Send to back"><i class="bx bx-chevrons-down"></i></button>
            <button class="layer-btn" data-action="sendBackward" title="Send backward"><i class="bx bx-chevron-down"></i></button>
            <button class="layer-btn" data-action="bringForward" title="Bring forward"><i class="bx bx-chevron-up"></i></button>
            <button class="layer-btn" data-action="bringToFront" title="Bring to front"><i class="bx bx-chevrons-up"></i></button>
        </div>
    </div>

    <!-- Arrow Sidebar -->
    <div id="sidebar-arrow" class="sidebar" style="display:none">
        <div class="sidebar-section">
            <div class="sidebar-label">Stroke</div>
            <div class="color-grid" data-prop="stroke">
                <button class="color-swatch active" data-value="#fff" style="background:#fff"></button>
                <button class="color-swatch" data-value="#FF8383" style="background:#FF8383"></button>
                <button class="color-swatch" data-value="#3A994C" style="background:#3A994C"></button>
                <button class="color-swatch" data-value="#56A2E8" style="background:#56A2E8"></button>
                <button class="color-swatch" data-value="#FFD700" style="background:#FFD700"></button>
                <button class="color-swatch" data-value="#FF69B4" style="background:#FF69B4"></button>
                <button class="color-swatch" data-value="#A855F7" style="background:#A855F7"></button>
            </div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-label">Width</div>
            <div class="btn-group" data-prop="strokeWidth">
                <button class="group-btn active" data-value="2">2</button>
                <button class="group-btn" data-value="4">4</button>
                <button class="group-btn" data-value="7">7</button>
            </div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-label">Style</div>
            <div class="btn-group" data-prop="strokeStyle">
                <button class="group-btn active" data-value="solid" title="Solid">
                    <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="currentColor" stroke-width="2"/></svg>
                </button>
                <button class="group-btn" data-value="dashed" title="Dashed">
                    <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/></svg>
                </button>
            </div>
        </div>
        <div class="sidebar-section sidebar-layers">
            <button class="layer-btn" data-action="sendToBack" title="Send to back"><i class="bx bx-chevrons-down"></i></button>
            <button class="layer-btn" data-action="sendBackward" title="Send backward"><i class="bx bx-chevron-down"></i></button>
            <button class="layer-btn" data-action="bringForward" title="Bring forward"><i class="bx bx-chevron-up"></i></button>
            <button class="layer-btn" data-action="bringToFront" title="Bring to front"><i class="bx bx-chevrons-up"></i></button>
        </div>
    </div>

    <!-- Line Sidebar -->
    <div id="sidebar-line" class="sidebar" style="display:none">
        <div class="sidebar-section">
            <div class="sidebar-label">Stroke</div>
            <div class="color-grid" data-prop="stroke">
                <button class="color-swatch active" data-value="#fff" style="background:#fff"></button>
                <button class="color-swatch" data-value="#FF8383" style="background:#FF8383"></button>
                <button class="color-swatch" data-value="#3A994C" style="background:#3A994C"></button>
                <button class="color-swatch" data-value="#56A2E8" style="background:#56A2E8"></button>
                <button class="color-swatch" data-value="#FFD700" style="background:#FFD700"></button>
                <button class="color-swatch" data-value="#FF69B4" style="background:#FF69B4"></button>
                <button class="color-swatch" data-value="#A855F7" style="background:#A855F7"></button>
            </div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-label">Width</div>
            <div class="btn-group" data-prop="strokeWidth">
                <button class="group-btn active" data-value="2">2</button>
                <button class="group-btn" data-value="4">4</button>
                <button class="group-btn" data-value="7">7</button>
            </div>
        </div>
        <div class="sidebar-section sidebar-layers">
            <button class="layer-btn" data-action="sendToBack" title="Send to back"><i class="bx bx-chevrons-down"></i></button>
            <button class="layer-btn" data-action="sendBackward" title="Send backward"><i class="bx bx-chevron-down"></i></button>
            <button class="layer-btn" data-action="bringForward" title="Bring forward"><i class="bx bx-chevron-up"></i></button>
            <button class="layer-btn" data-action="bringToFront" title="Bring to front"><i class="bx bx-chevrons-up"></i></button>
        </div>
    </div>

    <!-- Freehand/Paintbrush Sidebar -->
    <div id="sidebar-freehand" class="sidebar" style="display:none">
        <div class="sidebar-section">
            <div class="sidebar-label">Stroke</div>
            <div class="color-grid" data-prop="stroke">
                <button class="color-swatch active" data-value="#fff" style="background:#fff"></button>
                <button class="color-swatch" data-value="#FF8383" style="background:#FF8383"></button>
                <button class="color-swatch" data-value="#3A994C" style="background:#3A994C"></button>
                <button class="color-swatch" data-value="#56A2E8" style="background:#56A2E8"></button>
                <button class="color-swatch" data-value="#FFD700" style="background:#FFD700"></button>
                <button class="color-swatch" data-value="#FF69B4" style="background:#FF69B4"></button>
                <button class="color-swatch" data-value="#A855F7" style="background:#A855F7"></button>
            </div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-label">Width</div>
            <div class="btn-group" data-prop="strokeWidth">
                <button class="group-btn" data-value="1">1</button>
                <button class="group-btn active" data-value="2">2</button>
                <button class="group-btn" data-value="4">4</button>
                <button class="group-btn" data-value="7">7</button>
            </div>
        </div>
        <div class="sidebar-section sidebar-layers">
            <button class="layer-btn" data-action="sendToBack" title="Send to back"><i class="bx bx-chevrons-down"></i></button>
            <button class="layer-btn" data-action="sendBackward" title="Send backward"><i class="bx bx-chevron-down"></i></button>
            <button class="layer-btn" data-action="bringForward" title="Bring forward"><i class="bx bx-chevron-up"></i></button>
            <button class="layer-btn" data-action="bringToFront" title="Bring to front"><i class="bx bx-chevrons-up"></i></button>
        </div>
    </div>

    <!-- Text Sidebar -->
    <div id="sidebar-text" class="sidebar" style="display:none">
        <div class="sidebar-section">
            <div class="sidebar-label">Color</div>
            <div class="color-grid" data-prop="color">
                <button class="color-swatch active" data-value="#fff" style="background:#fff"></button>
                <button class="color-swatch" data-value="#FF8383" style="background:#FF8383"></button>
                <button class="color-swatch" data-value="#3A994C" style="background:#3A994C"></button>
                <button class="color-swatch" data-value="#56A2E8" style="background:#56A2E8"></button>
                <button class="color-swatch" data-value="#FFD700" style="background:#FFD700"></button>
                <button class="color-swatch" data-value="#FF69B4" style="background:#FF69B4"></button>
                <button class="color-swatch" data-value="#A855F7" style="background:#A855F7"></button>
            </div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-label">Size</div>
            <div class="btn-group" data-prop="fontSize">
                <button class="group-btn" data-value="20">S</button>
                <button class="group-btn active" data-value="30">M</button>
                <button class="group-btn" data-value="48">L</button>
                <button class="group-btn" data-value="72">XL</button>
            </div>
        </div>
    </div>

    <!-- Frame Sidebar -->
    <div id="sidebar-frame" class="sidebar" style="display:none">
        <div class="sidebar-section">
            <div class="sidebar-label">Frame Name</div>
            <input type="text" id="frame-name-input" class="sidebar-input" value="Frame" placeholder="Frame name" />
        </div>
        <div class="sidebar-section sidebar-layers">
            <button class="layer-btn" data-action="sendToBack" title="Send to back"><i class="bx bx-chevrons-down"></i></button>
            <button class="layer-btn" data-action="sendBackward" title="Send backward"><i class="bx bx-chevron-down"></i></button>
            <button class="layer-btn" data-action="bringForward" title="Bring forward"><i class="bx bx-chevron-up"></i></button>
            <button class="layer-btn" data-action="bringToFront" title="Bring to front"><i class="bx bx-chevrons-up"></i></button>
        </div>
    </div>

    <!-- ═══════════ FOOTER (bottom right - zoom + undo/redo) ═══════════ -->
    <div id="footer">
        <div class="footer-group">
            <button id="undoBtn" class="footer-btn" title="Undo (Ctrl+Z)"><i class="bx bx-undo"></i></button>
            <div class="footer-divider"></div>
            <button id="redoBtn" class="footer-btn" title="Redo (Ctrl+Shift+Z)"><i class="bx bx-redo"></i></button>
        </div>
        <div class="footer-group">
            <button id="zoomOut" class="footer-btn" title="Zoom Out (Ctrl+-)"><i class="bx bx-minus"></i></button>
            <div class="footer-divider"></div>
            <button id="zoomPercent" class="footer-btn zoom-label" title="Reset Zoom (Ctrl+0)">100%</button>
            <div class="footer-divider"></div>
            <button id="zoomIn" class="footer-btn" title="Zoom In (Ctrl++)"><i class="bx bx-plus"></i></button>
        </div>
    </div>

    <!-- ═══════════ SAVE TOAST ═══════════ -->
    <div id="save-toast" style="display:none">
        <i class="bx bx-check" style="color:#4ade80;margin-right:6px"></i>Saved
    </div>

    <!-- ═══════════ SVG CANVAS ═══════════ -->
    <svg id="freehand-canvas"
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
