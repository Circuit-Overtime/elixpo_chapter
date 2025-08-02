const prompts = ["hufflefluf hogwarts student", "metal leafy 2D coin", "a cute crystal dog fakemon"];
const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const randomChar = () => chars[Math.floor(Math.random() * (chars.length - 1))],
      randomString = length => Array.from(Array(length)).map(randomChar).join("");

const card = document.getElementById("SecondRowSecondLayoutInnovate"),
      letters = card.querySelector(".card-letters");

const handleOnMove = e => {
  const rect = card.getBoundingClientRect(),
        x = e.clientX - rect.left,
        y = e.clientY - rect.top;

  letters.style.setProperty("--x", `${x}px`);
  letters.style.setProperty("--y", `${y}px`);

  letters.innerText = randomString(2500);    
}

card.onmousemove = e => handleOnMove(e);

card.ontouchmove = e => handleOnMove(e.touches[0]);


document.getElementById("searchButton").addEventListener("click", () => {
  document.getElementById("reloadAnimation").style.top = "85%";


  document.getElementById("searchButton").style.animation = "none";
  void document.getElementById("searchButton").offsetWidth;
  document.getElementById("searchButton").style.animation = "SearchButtonGrow 5s ease-in-out forwards";
  

  document.getElementById("searchBar").style.animation = "none";
  void document.getElementById("searchBar").offsetWidth;
  document.getElementById("searchBar").style.animation = "hideSearchBar 1s linear forwards";

  document.getElementById("lowerTileImageAI").style.opacity = "1";
  document.getElementById("lowerTileImageAI").style.animation = "none";
  void document.getElementById("lowerTileImageAI").offsetWidth;
  document.getElementById("lowerTileImageAI").style.animation = "imageTileAppear 2s ease forwards";

  document.getElementById("upperTileImageAI").style.opacity = "1";
  document.getElementById("upperTileImageAI").style.animation = "none";
  void document.getElementById("upperTileImageAI").offsetWidth;
  document.getElementById("upperTileImageAI").style.animation = "imageTileAppear 2s ease forwards";

  document.getElementById("headingText").style.opacity = "0";
  document.getElementById("descriptionText").style.opacity = "0";
})



var randomPrompt = [Math.floor(Math.random()*prompts.length)];
if(parseInt(randomPrompt[0]) == 0)
{
  document.getElementById("searchText").innerHTML = prompts[randomPrompt[0]];
  document.getElementById("upperTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/girlImage1.jpg?alt=media&token=c8370384-87b9-480e-9075-4c24a70eb4e3)";
  document.getElementById("lowerTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/girlImage2.jpg?alt=media&token=297f6a30-336e-437d-b8ac-e286acbc5d03)";
  document.getElementById("upperTileImageAI").style.backgroundSize = "cover";
  document.getElementById("lowerTileImageAI").style.backgroundSize = "cover";
}
else if(parseInt(randomPrompt[0]) == 1)
{
  document.getElementById("searchText").innerHTML = prompts[randomPrompt[0]];
  document.getElementById("upperTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/metalLeafy1.jpg?alt=media&token=c46b3f96-bfdc-4d23-9269-729ab1d3f038)";
  document.getElementById("lowerTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/metalLeafy2.jpg?alt=media&token=9a4ad97d-6d08-4b4d-a6ed-79cf69eb3108)";
  document.getElementById("upperTileImageAI").style.backgroundSize = "cover";
  document.getElementById("lowerTileImageAI").style.backgroundSize = "cover";
}
else if(parseInt(randomPrompt[0]) == 2)
{
  document.getElementById("searchText").innerHTML = prompts[randomPrompt[0]];
  document.getElementById("upperTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/puppy1.jpg?alt=media&token=7204fa5f-b970-43a3-a525-e0bd26ddba24)";
  document.getElementById("lowerTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/puppy2.jpg?alt=media&token=bd9722bc-1552-40d3-8d8e-aafe98acb10b)";
  document.getElementById("upperTileImageAI").style.backgroundSize = "cover";
  document.getElementById("lowerTileImageAI").style.backgroundSize = "cover";
}


document.getElementById("reloadAnimation").addEventListener("click", () => {
var randomPrompt = [Math.floor(Math.random()*prompts.length)];
console.log(parseInt(randomPrompt[0]))

  document.getElementById("reloadAnimation").style.top = "105%";


  document.getElementById("searchButton").style.animation = "none";
  void document.getElementById("searchButton").offsetWidth;
  document.getElementById("searchButton").style.animation = "SearchButtonGrow 2s reverse forwards";

  document.getElementById("searchBar").style.animation = "none";
  void document.getElementById("searchBar").offsetWidth;
  document.getElementById("searchBar").style.animation = "hideSearchBar 1s reverse forwards";

  
  document.getElementById("lowerTileImageAI").style.animation = "none";
  void document.getElementById("lowerTileImageAI").offsetWidth;
  document.getElementById("lowerTileImageAI").style.animation = "imageTileAppear 2s reverse forwards";
  document.getElementById("lowerTileImageAI").style.opacity = "0";


  
  document.getElementById("upperTileImageAI").style.animation = "none";
  void document.getElementById("upperTileImageAI").offsetWidth;
  document.getElementById("upperTileImageAI").style.animation = "imageTileAppear 2s reverse forwards";
  document.getElementById("upperTileImageAI").style.opacity = "0";

  document.getElementById("headingText").style.opacity = "1";
  document.getElementById("descriptionText").style.opacity = "1";
  
setTimeout(() => {
  if(parseInt(randomPrompt[0]) == 0)
{
  document.getElementById("searchText").innerHTML = prompts[randomPrompt[0]];
  document.getElementById("upperTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/girlImage1.jpg?alt=media&token=c8370384-87b9-480e-9075-4c24a70eb4e3)";
  document.getElementById("lowerTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/girlImage2.jpg?alt=media&token=297f6a30-336e-437d-b8ac-e286acbc5d03)";
  document.getElementById("upperTileImageAI").style.backgroundSize = "cover";
  document.getElementById("lowerTileImageAI").style.backgroundSize = "cover";
}
else if(parseInt(randomPrompt[0]) == 1)
{
  document.getElementById("searchText").innerHTML = prompts[randomPrompt[0]];
  document.getElementById("upperTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/metalLeafy1.jpg?alt=media&token=c46b3f96-bfdc-4d23-9269-729ab1d3f038)";
  document.getElementById("lowerTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/metalLeafy2.jpg?alt=media&token=9a4ad97d-6d08-4b4d-a6ed-79cf69eb3108)";
  document.getElementById("upperTileImageAI").style.backgroundSize = "cover";
  document.getElementById("lowerTileImageAI").style.backgroundSize = "cover";
}
else if(parseInt(randomPrompt[0]) == 2)
{
  document.getElementById("searchText").innerHTML = prompts[randomPrompt[0]];
  document.getElementById("upperTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/puppy1.jpg?alt=media&token=7204fa5f-b970-43a3-a525-e0bd26ddba24)";
  document.getElementById("lowerTileImageAI").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/puppy2.jpg?alt=media&token=bd9722bc-1552-40d3-8d8e-aafe98acb10b)";
  document.getElementById("upperTileImageAI").style.backgroundSize = "cover";
  document.getElementById("lowerTileImageAI").style.backgroundSize = "cover";
}
}, 1500);  

})