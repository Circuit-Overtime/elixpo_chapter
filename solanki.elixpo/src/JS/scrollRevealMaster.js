

document.querySelectorAll(".StaticImageLoading").forEach(function(e, index) {
    e.classList.add('slow'+index);

    index += 1;
})

for(i = 0; i < document.querySelectorAll(".StaticImageLoading").length; i++)
{
    dom_name = String(".slow"+i)
    ScrollReveal().reveal(dom_name, { delay: (i*100)+600 });
}
ScrollReveal().reveal('.loadingOverlay', { delay: 200 });
ScrollReveal().reveal('.loaderOne', { delay: 400 });
ScrollReveal().reveal('.loadingText', { delay: 500 });
ScrollReveal().reveal('.timeLine', { delay: 600 });
ScrollReveal().reveal('.timeLineSeek', { scale: 0.25, delay: 1000 });







// ScrollReveal().reveal('.visuMagicContainer .visuMagicMainSlow', { scale: 0.25, delay: 3100 });



