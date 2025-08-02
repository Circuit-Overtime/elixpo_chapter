document.getElementById("rootRedirect").addEventListener("click", () => {
  redirectTo("")
})


document.getElementById("personalRedirect").addEventListener("click", () => {
  redirectTo("me")
})

document.getElementById("skillsRedirect").addEventListener("click", () => {
  redirectTo("skills")
})

document.getElementById("projectsRedirect").addEventListener("click", () => {
  redirectTo("projects");
});

document.getElementById("galleryRedirect").addEventListener("click", () => {
  redirectTo("gallery");
});

document.getElementById("contactRedirect").addEventListener("click", () => {
  redirectTo("contact");
});