
document.getElementById("microphoneAccessBtn").addEventListener("click", () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // console.log('getUserMedia supported');
    
        // Request access to the microphone
        navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
          document.getElementById("microphoneAccessBtn").style.opacity = "0.8";
          document.getElementById("microphoneAccessBtn").style.pointerEvents = "none";
          document.getElementById("mictext").innerHTML = "Blow Air on the Screen";
        // audio access guranted
            var audioContext = new AudioContext();
            var audioStream = audioContext.createMediaStreamSource(stream);
            
            // Create an AnalyserNode to process audio data
            var analyser = audioContext.createAnalyser();
            analyser.fftSize = 1024; // You can adjust this value for better frequency resolution
            
            // Connect the audio stream to the analyser
            function analyzeAudio() {
              // Create a buffer to store frequency data
              var bufferLength = analyser.frequencyBinCount;
              var dataArray = new Uint8Array(bufferLength);
              
              // Get frequency data
              analyser.getByteFrequencyData(dataArray);
              
              // Check if blow sound is detected (you may need to adjust the threshold)
              var threshold = 250; // Adjust this value as needed
              var isBlowDetected = false;
              for (var i = 0; i < bufferLength; i++) {
                if (dataArray[i] > threshold) {
                  isBlowDetected = true;
                  break;
                }
              }
              
              // Trigger action if blow sound is detected
              if (isBlowDetected) {
                console.log("Blow sound detected!");
                blowCandles();
                const allHidden = [...document.querySelectorAll(".flame")].every(elm => elm.classList.contains("hidden"));
                if (allHidden) {
                  
                  document.getElementById("microphoneAccessBtn").style.opacity = "0";
                  document.getElementById("microphoneAccessBtn").style.pointerEvents = "none";
                  document.querySelector(".confetti").style.opacity = "1";
                  document.querySelector(".confetti").style.zIndex = "1000";

                  setTimeout(() => {
                    document.querySelector(".confetti").style.opacity = "0";
                    document.querySelector(".confetti").style.zIndex = "-1";
                  }, 2200);
                  // Your code to stop the tracks
                  stream.getTracks().forEach(function(track) {
                      track.stop();
                      
                  });
              }
               
              }
              
              // Continue analyzing audio data in real-time
              requestAnimationFrame(analyzeAudio);
            }

            audioStream.connect(analyser);
            analyzeAudio(analyser);
console.log("hearing");
        })
        .catch(function(err) {
            // console.error('Microphone access denied:', err);
        });
    } else {
        alert('Please Try From a Different Device');
    }
})

let textWriting = setInterval(() => {
  if(document.querySelectorAll(".candle").length > 0)
  {
    const allHidden = [...document.querySelectorAll(".flame")].every(elm => elm.classList.contains("hidden"));
  if(allHidden)
  {
    if(window.matchMedia('(min-width: 640px)'))
    {
      db.collection("links").doc(sessionStorage.getItem("birthdayLinkDetails")).get().then((doc) => {
    
        typeWriterErrorHTML("messageText",doc.data().message);
      })
      document.getElementById("cake").style.opacity = "0.1";
    }
    else
    {
      db.collection("links").doc(sessionStorage.getItem("birthdayLinkDetails")).get().then((doc) => {
    
        typeWriterErrorHTML("messageText",doc.data().message);
      })
      document.getElementById("cake").style.opacity = "1";
    }

    
    clearInterval(textWriting)
  }
  }
  
}, 100);


// document.getElementById("messageText").innerHTML = "May your birthday be filled with laughter, joy, and cherished moments that warm your heart and bring a smile to your face. Here's to another wonderful year ahead filled with love, happiness, and countless blessings. Happy birthday!";


 
