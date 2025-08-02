function typeWriterEffectHTML(idOfTextHolder, textToType, speed) {
  var i = 0;
  var speed = speed || 55; // Default speed if not provided
  var el = document.getElementById(idOfTextHolder);
  el.innerHTML = "";
  el.style.opacity = 0;
  function type() {
      if (i < textToType.length) {
          el.innerHTML += textToType.charAt(i);
          i++;
          setTimeout(type, speed);
      } else {
          // Fade in after typing is complete
          el.style.transition = "opacity 0.8s";
          el.style.opacity = 1;
      }
  }
  type();
  // Start fade-in as soon as typing starts
  setTimeout(() => {
      el.style.transition = "opacity 0.8s";
      el.style.opacity = 1;
  }, 100);
}


document.getElementById("linkedinRedirect").addEventListener("click", () => {
    window.open("https://www.linkedin.com/in/solankighoshvideoeditor/?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app", "_blank")
  })
  
  document.getElementById("instagramRedirect").addEventListener("click", () => {
    window.open("https://www.instagram.com/a.creative_mess?igsh=MXkxdTU1ZDUxaG8wYQ%3D%3D", "_blank")
  })
  
  
  document.getElementById("facebookRedirect").addEventListener("click", () => {
    window.open("https://www.facebook.com/solankighosh65?mibextid=ZbWKwL", "_blank")
  })
  

  document.getElementById("redirectWebsite").addEventListener("click", () => {
    redirectTo("")
  }) //feature for website link

  document.getElementById("redirectWebsiteCV").addEventListener("click", () => {
    redirectTo("about")
  }) 


    document.getElementById("profileLogoCont").addEventListener("load", () => {
     
    })

    window.onload = e => {
        document.getElementById("LazyLoadprofileLogoCont").style.opacity = 0;
    }

    typeWriterEffectHTML("classDesc","With almost 3 years of video editing mastery, I've melded pixels into mesmerizing tales. My expertise spans dynamic cuts, cinematic color grading, and seamless soundscapes, ensuring each video is a captivating visual journey.", 5)
