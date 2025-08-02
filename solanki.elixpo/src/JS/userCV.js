
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs';

// Set the worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
const linkedinURL = "https://www.linkedin.com/in/solankighoshvideoeditor"
const url = "../CSS/ASSESTS/SOLANKI GHOSH CV.pdf"; 
let pdfDoc = null, pageNum = 1, pageRendering = false, pageNumPending = null;
const scale = 1.2; // You can adjust this for zoom level
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const pageInfoSpan = document.getElementById('page-info');
const pdfLoader = document.getElementById('pdf-loader');
const pdfControls = document.getElementById('pdf-controls');

// Render a given page number
function renderPage(num) {
    pageRendering = true;
    canvas.style.opacity = '0.5'; // Dim canvas during render
    pdfLoader.style.display = 'block'; // Show loader during render
    pdfLoader.textContent = 'Rendering page...';


    pdfDoc.getPage(num).then((page) => {
        const viewport = page.getViewport({ scale });

        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
        };

        page.render(renderContext).promise.then(() => {
            pageRendering = false;
            pdfLoader.style.display = 'none'; // Hide loader
            canvas.style.display = 'block'; // Ensure canvas is visible
            canvas.style.opacity = '1'; // Restore full opacity
            pdfControls.style.display = 'flex'; // Ensure controls are visible
            pageInfoSpan.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;

            if (pageNumPending !== null) {
                // New page requested while rendering was in progress
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    }).catch(error => {
        console.error("Error rendering page:", error);
        pdfLoader.textContent = "Error rendering page.";
        canvas.style.opacity = '1';
        pageRendering = false;
    });
}

// Queue render to handle page while another is rendering
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

// Button listeners
document.getElementById('prev-page').addEventListener('click', () => {
    if (pageNum <= 1) {
        return; // Already on first page
    }
    pageNum--;
    queueRenderPage(pageNum);
});

document.getElementById('next-page').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) {
        return; // Already on last page
    }
    pageNum++;
    queueRenderPage(pageNum);
});

// Load the PDF
pdfjsLib.getDocument(url).promise
    .then((loadedPdf) => {
        pdfDoc = loadedPdf;
        pdfLoader.textContent = 'PDF loaded, rendering page 1...';
        renderPage(pageNum);
    })
    .catch((error) => {
        console.error("Error loading PDF:", error);
        pdfLoader.textContent = `Failed to load PDF. Error`;
        canvas.style.display = 'none'; 
        pdfControls.style.display = 'none'; 
    });

document.getElementById("rootRedirect").addEventListener("click", () => {
    redirectTo("")
});

document.getElementById("linkedinRedirect").addEventListener("click", () => {
    location.href = linkedinURL;
})