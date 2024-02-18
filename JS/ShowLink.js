let index = 0,
    interval = 1000;

const rand = (min, max) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

const animate = star => {
  star.style.setProperty("--star-left", `${rand(-10, 100)}%`);
  star.style.setProperty("--star-top", `${rand(-40, 80)}%`);

  star.style.animation = "none";
  star.offsetHeight;
  star.style.animation = "";
}

for(const star of document.getElementsByClassName("magic-starDir1")) {
  setTimeout(() => {
    animate(star);
    
    setInterval(() => animate(star), 1000);
  }, index++ * (interval / 3))
}

window.onload = e => {
  if(sessionStorage.getItem("linkToShare") == null)
  {
    location.replace("birthdayCard.html");
  }
  else 
  {
    document.getElementById("linkAccept").value = sessionStorage.getItem("linkToShare");
  }
  
}

document.getElementById("makeCardCard").addEventListener("click", () => {
  location.replace("birthdayCard.html");
})
document.getElementById("fetchCard").addEventListener("click", () => {
  let inviteCopied = `
Hey! Here's Surprise for you....
    I've made a Small Birthday Gift for You....
        Here's The Secret Code for you to Access it: '${sessionStorage.getItem("linkToShare")}'

        1. Go to the Site and Paste your Secret Code
        2. Click on Receive Card to see the Surprise
      
    Wishing you a very happy day!

    click on this link to get your Surprise:- https://circuit-overtime.github.io/Birthday/linkRedirecrt.html

    ....Don't Forget, your secret code is "${sessionStorage.getItem("linkToShare")}";
(Secured by Firebase, Hosted by GitHub);
`;



navigator.clipboard.writeText(inviteCopied)
  .then(() => {
    document.getElementById("linkAccept").value = "Invitation Copied! Share Now";
    setTimeout(() => {
      document.getElementById("linkAccept").value = sessionStorage.getItem("linkToShare");
    }, 1200);
  })
  .catch(err => {
    document.getElementById("linkAccept").value = "Copy Failed Try Again";
    setTimeout(() => {
      document.getElementById("linkAccept").value = sessionStorage.getItem("linkToShare");
    }, 1200);
  });
})