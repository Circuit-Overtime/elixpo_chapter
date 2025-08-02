const linkedinURL = "https://www.linkedin.com/in/solankighoshvideoeditor"
document.querySelectorAll("#image-container > div").forEach(div => {
  const lazyImg = div.querySelector(".autoEditaLazyLoading"); // blurred placeholder
  const fullImg = div.querySelector('img[loading="lazy"]');   // actual image

  if (lazyImg && fullImg) {
    // Hide full image initially
    fullImg.style.opacity = "0";
    fullImg.style.transition = "opacity 0.5s ease";

    const onLoad = () => {
      lazyImg.style.display = "none";       // hide blur
      fullImg.style.opacity = "1";          // fade in actual image
      fullImg.classList.add("unblur");      // optional: remove blur if any applied via CSS
    };

    if (fullImg.complete && fullImg.naturalHeight !== 0) {
      // Already loaded (from cache)
      onLoad();
    } else {
      // Load event
      fullImg.addEventListener("load", onLoad);
    }
  }
});


document.getElementById("linkedInSocial").addEventListener("click", function() {
  location.href = linkedinURL;
});

document.getElementById("galleryImagesAutoEditaBtn").addEventListener("click", function() {
  redirectTo("gallery"); 
});
document.getElementById("socialSectionAutoEditaBtn").addEventListener("click", function() {
  const section = document.getElementById("autoEditaSection");
  const target = document.getElementById("FirstRowSecondLayoutEdita");
  if (section && target) {
    const sectionRect = section.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const offset = targetRect.top - sectionRect.top + scrollTop;
    section.scrollTo({ top: offset, behavior: "smooth" });
  }
});