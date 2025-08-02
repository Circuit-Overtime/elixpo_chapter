// filepath: /e:/elixpo/JS/publications.js

const publications = [
    {
        title: "Exploring Microcode CPU Instructions with RISC-V Breadboard Computer",
        year: "2025",
        isNew: true
    }
];

function renderPublications(publications) {
    const container = document.getElementById('publications');
    if (!container) return;

    publications.forEach(pub => {
        const pubHTML = `
            <div class="publication h-[60px] w-full flex flex-row justify-between border-t-2 border-b-2 border-[#111] p-10">
                <div class="paperName flex flex-col gap-5 items-center justify-center h-full">
                    <p class="paperTitle font-extrabold text-[2em] text-left tracking-[2px] w-[200px] whitespace-nowrap">${pub.title}</p>
                </div>
                <div class="paperDate flex flex-row gap-5 items-center justify-center">
                    <p class="paperDate text-[#222] text-[2em] text-center font-bold">${pub.year}</p>
                    ${pub.isNew ? `
                        <span class="newTag relative flex h-[30px] text-[1.8em] text-[#ffc] bg-[#B63B12] items-center justify-center px-[2px] rounded-[5px]"> 
                            <p> NEW </p> 
                        </span>
                    ` : ''}
                    <ion-icon name="caret-forward" class="text-[2em] p-2 border-2 border-dashed border-[#222] rounded-[50%] cursor-pointer hover:rotate-[25deg] transition-[0.25s]" onclick="showPaper()"></ion-icon>
                </div>
            </div>
        `;
        container.innerHTML += pubHTML;
    });
}

window.onload = function() {
    renderPublications(publications);
};

function showPaper() 
{
    showToast("Paper details coming soon!", 3000);
}