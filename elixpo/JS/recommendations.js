let recommendations = [
    {
      "content" : "I worked with Ayushman on the Pollinations project where he contributed to our search infrastructure and API documentation. He implemented reliable fallback systems, maintained key services, and took initiative on additional improvements that benefited the project.",
      "name" : "Thomash Haferlach",
      "designation" : "Beekeeper at Pollinations.AI",
      "image": "https://media.licdn.com/dms/image/v2/D4D03AQH5H0wOkQnXaw/profile-displayphoto-shrink_100_100/B4DZcWBd8cGcAU-/0/1748421173392?e=1757548800&v=beta&t=WMeW8gSGXG_h_CLv3B4kWaYrj1E2CXyeY5FYE5Govko"
    },
    {
    "content" : "Ayushman has strong problem-solving skills and a great spirit for collaboration. Additionally, Ayushman is a quick learner making him an asset to any academic or professional setting.",
    "name" : "Dr. Subarsha Banerjee",
    "designation" : "Assistant Professor in JIS University",
    "image": "https://media.licdn.com/dms/image/v2/C4E03AQGIk84i2XqYkQ/profile-displayphoto-shrink_100_100/profile-displayphoto-shrink_100_100/0/1649254631143?e=1757548800&v=beta&t=DiKOLLNyz-Q-qRxG9v-Nn9njWcXVI9n1U2YHcFsxFN0"
    },
    {
    "content" : "As a student, Ayushman has consistently demonstrated a deep curiosity and dedication towards learning. His academic performance has been marked by a strong grasp of complex concepts and a remarkable ability to apply theoretical knowledge in practical situations. Whether it was through class participation, project work, or independent research, Ayushman has shown a commitment to excellence that sets him apart.",
    "name" : "Dr. Bidisha Bhabani",
    "designation" : "Assistant Professor in JIS University",
    "image": "https://media.licdn.com/dms/image/v2/D5603AQFVTKreK1ABIQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1705933823066?e=1757548800&v=beta&t=jFjbixOgOp3mHwFuXO2DwsfrKjCiUWhHcWdULp2PqzA"
    },
    {
      "content" : "I had the pleasure of working closely with Ayushman Bhattacharya on an AI-driven project, and honestly, I couldn’t have asked for a better collaborator. From day one, Ayushman really impressed me with his technical expertise and his willingness to jump right in. He has a great grasp of backend development and AI workflows, and he always managed to deliver solid, reliable solutions that genuinely boosted our project’s performance.",
      "name" : "Abhishek Kushwaha",
      "designation" : "Co-Founder & CTO @hyrecruitai",
      "image" : "https://media.licdn.com/dms/image/v2/D4D03AQHTbqvasPwJYQ/profile-displayphoto-shrink_100_100/profile-displayphoto-shrink_100_100/0/1722429014287?e=1758153600&v=beta&t=_YYJe6zxbY2beZI16PI5pwMLMy-Vx4dUZPF2w4eMhJo"
    }
]


function appendRecommendation(recommendations)
{
    const recommendationContainer = document.getElementById('recommendationSection');

    recommendations.forEach(recommendation => {
        let recommendationTile = `
        <div id="scrollZone" class="recommendationCard shrink-0 relative h-[400px] w-[650px] border-4 border-[#222] rounded-[25px] bg-[#E2D9C8] p-5 justify-center items-center mr-5 cursor-pointer hover:brightness-[85%] transition-all duration-300 ease-in-out">
          <div class="dottedContainer relative h-full w-full border-2 border-dashed border-[#222] rounded-[30px] flex flex-col gap-5 p-10 justify-between">
            <p class="quote text-[#333] text-[1.55em] whitespace-normal break-words underline decoration-1 decoration-[0.05rem] decoration-[#888] underline-offset-[6px]"> "${(recommendation.content).slice(0,200)}..."</p>
            <div class="attribution flex flex-row items-center items-left gap-5">
              <div class="userLogo relative bg-[url(${recommendation.image})] bg-cover bg-center h-[80px] w-[80px] border-2 border-[#222] rounded-[50%] grayscale sepia-[50%]"></div>
              <div class="userInfo flex flex-col gap-1 leading-[30px]">
                <div class="userName font-extrabold text-[2.5em] relative tracking-wide"> ${recommendation.name} </div>
                <div class="userDesig font-thin text-[2em] relative"> ${recommendation.designation} </div>
              </div>
            </div>
            <div class="stamp absolute bottom-[20px] right-[20px] h-[80px] w-[80px] bg-[url(../CSS/ASSESTS/projects/stamp-2.png)] bg-cover bg-center "></div>
          </div> 
        </div>
    `;
        recommendationContainer.innerHTML += recommendationTile;
    });
    

    
}

appendRecommendation(recommendations);