const firebaseConfig = {
  apiKey: "AIzaSyDMhQHacKgiUGqOHaPzJ9qhKT2rdH5Rlt4",
  authDomain: "birthday-1340e.firebaseapp.com",
  projectId: "birthday-1340e",
  storageBucket: "birthday-1340e.appspot.com",
  messagingSenderId: "714776227684",
  appId: "1:714776227684:web:6b573288215ab6c4091471"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);   
const db = firebase.firestore();

function generateRandomCode(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomCode = '';
  for (let i = 0; i < length; i++) {
      randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomCode;
}

function typeWriterErrorHTML(idOfTextHolder, textToType, speed) {
  let typingTime;
  clearInterval(typingTime);
  document.getElementById(idOfTextHolder).innerHTML = "";
  var i = 0;
  var speed = speed || 25; // Default speed if not provided

  function type() {
    
      if (i < textToType.length) {
          document.getElementById(idOfTextHolder).innerHTML += textToType.charAt(i);
          i++;
          typingTime = setTimeout(type, speed);
      }
       if(i == textToType.length )
       {
          setTimeout(() => {
              document.getElementById(idOfTextHolder).innerHTML = "";
          }, 1500);
       }
  }
  type(); // Call the function to start the typing effect
}

document.getElementById("createCard").addEventListener("click", () => {
  generateCard();
})
async function generateCard() {
  const randomCode = generateRandomCode(10);
  const ageInput = document.getElementById("inputAge").value.trim();
  const nameInput = document.getElementById("inputName").value.trim();
  const messageInput = document.getElementById("includedMessage").value.trim();
  const customURL = document.getElementById("customURL").value.trim().toLowerCase();
  const timeNow = Date.now();

  if (ageInput !== "" && nameInput !== "") {
    document.querySelector(".loaderContainer").style.opacity = "1";
    document.querySelector(".loaderContainer").style.zIndex = "100";
      if (customURL === "") {

          let documentExists = false;
          do {

              documentExists = await doesItExist(randomCode);
          } while (documentExists);
          document.querySelector(".loaderContainer").style.opacity = "0";
          document.querySelector(".loaderContainer").style.zIndex = "-1";

          await generateDataBase(randomCode, ageInput, nameInput, messageInput, timeNow);

      }

      else
      {
          if (await checkCustomUrl(customURL)) {
            document.querySelector(".loaderContainer").style.opacity = "0";
            document.querySelector(".loaderContainer").style.zIndex = "-1";
              typeWriterErrorHTML("errorText", "Try a different custom URL!");
              return;
          } else {
              await generateDataBaseFromURL(customURL, ageInput, nameInput, messageInput, timeNow);
          }
      }
  } else {
      typeWriterErrorHTML("errorText", "Name and Age Please");
  }
}

async function doesItExist(docCode) {
  try {
      const docSnapshot = await db.collection("links").doc(docCode).get();
      return docSnapshot.exists;
  } catch (error) {
      console.error("Error fetching document: ", error);
      return false;
  }
}

function generateDataBaseFromURL(customURL, ageInput, nameInput, messageInput, timeNow) {
  db.collection("links").doc(customURL).set({
      age: ageInput,
      name: nameInput,
      encodeURL: customURL,
      message: messageInput,
      timeStamp: timeNow
  }).then((doc) => {
      document.querySelector(".loaderContainer").style.opacity = "1";
      document.querySelector(".loaderContainer").style.zIndex = "100";
      setTimeout(() => {
          clearInputsAndDisplayLoader();
          sessionStorage.setItem("linkToShare", customURL);
          location.replace("linkShow.html");
      }, 1200);
  });
}

async function generateDataBase(randomCode, ageInput, nameInput, messageInput, timeNow) {
  try {
      await db.collection("links").doc(randomCode).set({
          age: ageInput,
          name: nameInput,
          encodeURL: randomCode.toLowerCase(),
          message: messageInput,
          timeStamp: timeNow
      });
      document.querySelector(".loaderContainer").style.opacity = "1";
      document.querySelector(".loaderContainer").style.zIndex = "100";
      setTimeout(() => {
          clearInputsAndDisplayLoader();
          sessionStorage.setItem("linkToShare", randomCode);
          location.replace("linkShow.html");
      }, 1200);
  } catch (error) {
      console.error("Error generating database: ", error);
  }
}

async function checkCustomUrl(url) {
  try {
      const docSnapshot = await db.collection("links").doc(url).get();
      return docSnapshot.exists;
  } catch (error) {
      console.error("Error fetching document: ", error);
      return false;
  }
}

function clearInputsAndDisplayLoader() {
  document.getElementById("inputAge").value = "";
  document.getElementById("inputName").value = "";
  document.getElementById("includedMessage").value = "";
  document.getElementById("customURL").value = "";
  document.querySelector(".loaderContainer").style.opacity = "0";
  document.querySelector(".loaderContainer").style.zIndex = "-1";
}

document.getElementById("inputAge").addEventListener("input", function(event) {
  const input = event.target.value;
  const sanitizedInput = input.replace(/\D/g, ''); // Remove non-digit characters
  event.target.value = sanitizedInput; // Update input value
});

document.getElementById("redirectIcon").addEventListener("click", () => {
  location.replace("linkRedirect.html");
});

document.querySelector(".birthdayCap").addEventListener("load", () => {
  document.querySelector(".birthdayCapOpt").style.opacity = "0";
});

// Usage:


