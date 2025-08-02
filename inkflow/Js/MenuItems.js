// Menu functionality for InkFlow
document.addEventListener('DOMContentLoaded', function () {
    // Edit Menu Actions
    const editMenuItems = document.querySelectorAll('#edit-menu .menu-item');
    editMenuItems.forEach(item => {
        item.addEventListener('click', function () {
            const action = this.querySelector('span:first-child').textContent.trim().toLowerCase();
            switch (action) {
                case 'undo':
                    document.querySelector('#undo').click();
                    break;
                case 'redo':
                    document.querySelector('#redo').click();
                    break;
                case 'cut':
                    // Cut functionality will be implemented in future
                    console.log('Cut action clicked');
                    break;
                case 'copy':
                    // Copy functionality will be implemented in future
                    console.log('Copy action clicked');
                    break;
                case 'paste':
                    // Paste functionality will be implemented in future
                    console.log('Paste action clicked');
                    break;
                case 'select all':
                    // Select all functionality
                    selectAllElements();
                    break;
                case 'delete all':
                    document.querySelector('#clear').click();
                    break;
            }
        });
    });

    // View Menu Actions
    const viewMenuItems = document.querySelectorAll('#view-menu .menu-item');
    viewMenuItems.forEach(item => {
        item.addEventListener('click', function () {
            const action = this.querySelector('span:first-child').textContent.trim().toLowerCase();
            switch (action) {
                case 'zoom in':
                    document.querySelector('#zoom-in').click();
                    break;
                case 'zoom out':
                    document.querySelector('#zoom-out').click();
                    break;
            }
        });
    });

    // Export Menu Actions
    const exportMenuItems = document.querySelectorAll('#export-menu .menu-item');
    exportMenuItems.forEach(item => {
        item.addEventListener('click', function () {
            const action = this.querySelector('span:first-child').textContent.trim().toLowerCase();
            switch (action) {
                case 'download as png':
                    downloadCanvas('png');
                    break;
                case 'download as svg':
                    downloadCanvas('svg');
                    break;
                case 'download as jpg':
                    downloadCanvas('jpg');
                    break;
                case 'generate link':
                    generateCanvasLink();
                    break;
            }
        });
    });

    // Utility functions
    function downloadCanvas(format) {
        const canvas = document.querySelector('#canvas');
        let dataUrl;
        let fileName = `inkflow-canvas.${format}`;

        switch (format) {
            case 'png':
                dataUrl = canvas.toDataURL('image/png');
                break;
            case 'jpg':
                dataUrl = canvas.toDataURL('image/jpeg');
                break;
            case 'svg':
                // SVG export will be implemented in future
                console.log('SVG export - Coming Soon');
                return;
        }

        // Create download link
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

});
