document.body.insertAdjacentHTML('beforeend', '<p id="rightClickVouch" style="display:none;"></p>');
document.getElementById("rightClickVouch").style.position = "absolute";
document.getElementById("rightClickVouch").style.color = "#ffc";
document.getElementById("rightClickVouch").style.transition = "0.25s"; 
document.getElementById("rightClickVouch").style.fontFamily = "gabriola"; 
document.getElementById("rightClickVouch").style.opacity = "0.2";
// document.getElementById("rightClickVouch").style.display = "none";


    window.addEventListener('contextmenu', (event) => {
      rotate_deg = ["13deg", "-15deg", "25deg" , "-25deg" , "17deg", "-17deg", "-10deg", "10deg"];
      text_strings = ["sorry!", "killed RMB", "BAAAM!!", "Bruuhh!", "doesn't work!!", "SIKE!!", "don't-cheat", "you ain't developer!"];
      
  
      event.preventDefault();
      rotate_deg_rand = Math.floor(Math.random() * rotate_deg.length);
      rotate_deg_rand = (rotate_deg[rotate_deg_rand]);

      text_strings_random = Math.floor(Math.random() * text_strings.length);
      text_strings_random = text_strings[text_strings_random];
      document.getElementById("rightClickVouch").innerHTML = text_strings_random;
      clearTimeout(disp_timer);
      document.getElementById("rightClickVouch").style.opacity = "45%";
      
      document.getElementById("rightClickVouch").style.top = event.y+"px";
      document.getElementById("rightClickVouch").style.left = event.x+"px";
      document.getElementById("rightClickVouch").style.transform = "rotate("+rotate_deg_rand+"'deg')";

      // root_var = document.querySelector(":root");
      // root_var.style.setProperty("--top_position", event.y+"px");
      // root_var.style.setProperty("--left_position", event.x+"px");
      // root_var.style.setProperty("--rotate_value", rotate_deg_rand);


      var disp_timer = setTimeout(() => {
          document.getElementById("rightClickVouch").style.opacity = "0";
      }, 500);
  
  
   
    })
  //((e.code == "F12")) ||
    window.addEventListener("keydown", (e) => {
      if(((e.ctrlKey == true) && (e.code == "KeyU")) || ((e.ctrlKey == true) && (e.code == "KeyS")) || ((e.code == "F12")) || ((e.ctrlKey == true) && (e.code == "KeyP")))
      {
          e.preventDefault();
          clearTimeout(disp_timer);
          document.getElementById("rightClickVouch").style.opacity = "1";
          random_locations_x = ["253px", "193px", "1176px", "256px", "1085px", "1298px", "420px", "328px", "149px"];
          random_locations_y = ["179px", "365px", "551px", "542px", "316px", "281px", "175px", "470px", "565px"];
          random_locations_x_val = (Math.floor(Math.random() * random_locations_x.length));
          random_locations_x_val = random_locations_x[random_locations_x_val];
          random_locations_y_val = (Math.floor(Math.random() * random_locations_y.length));
          random_locations_y_val = random_locations_y[random_locations_y_val];
  
          rotate_deg = ["13deg", "-15deg", "25deg" , "-25deg" , "17deg", "-17deg", "-10deg", "10deg"];
          text_strings = ["sorry!", "killed RMB", "BAAAM!!", "Bruuhh!", "doesn't work!!", "SIKE!!", "don't-cheat", "you ain't developer!"];
  
  
          text_strings_random = Math.floor(Math.random() * text_strings.length);
          text_strings_random = text_strings[text_strings_random];
          document.getElementById("rightClickVouch").innerHTML = text_strings_random;
          rotate_deg_rand = (rotate_deg[rotate_deg_rand]);
          // root_var = document.querySelector(":root");
  
          // root_var.style.setProperty("--top_position", random_locations_x_val);
          // root_var.style.setProperty("--left_position", random_locations_y_val);
          // rotate_deg_rand = Math.floor(Math.random() * rotate_deg.length);

          document.getElementById("rightClickVouch").style.opacity = "0.4";
      
      document.getElementById("rightClickVouch").style.top = e.y+"px";
      document.getElementById("rightClickVouch").style.left = e.x+"px";
      document.getElementById("rightClickVouch").style.transform = "rotate("+rotate_deg_rand+"'deg')";


          
          var disp_timer = setTimeout(() => {
              document.getElementById("rightClickVouch").style.opacity = "0";
          }, 500);
  
  
      
      }
    });
