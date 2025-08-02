# Videolize – Advanced Personal Portfolio

**Videolize** is a modern, interactive personal portfolio website designed to showcase your skills, projects, and creative journey in a visually stunning way. Inspired by [Diagram.com](https://www.diagram.com/), Videolize leverages advanced frontend techniques, smooth animations, and a modular structure to deliver a unique digital presence for creative professionals.

---

## Table of Contents

- [Demo](#demo)
- [Features](#features)
- [Screenshots](#screenshots)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Backend Features](#backend-features)
- [Interactive Elements](#interactive-elements)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)

---

## Demo

Visit the live site: [https://solanki.elixpo.com](https://solanki.elixpo.com)

---

## Features

- **Modern Design:**  
  Utilizes GSAP, BentoBox, Glassmorphism, and Neumorphism for a cutting-edge look with smooth transitions and animations.

- **Event-Driven Animations:**  
  Interactive animations triggered by user actions for a sleek, fluid experience.

- **Modular Sections:**  
  - **About Me:** Personalized introduction and journey timeline.
  - **Skills:** Interactive display of key skills and software proficiencies.
  - **Projects:** Dynamic showcase of projects with lazy-loaded images and hover effects.
  - **Gallery:** Custom-designed gallery for photographs and creative works.
  - **Contact:** Contact form and social media links.
  - **Footer:** Animated social icons and quick navigation.

- **CV Feature:**  
  View and download a professional resume/CV directly from the site.

- **Smooth Navigation:**  
  Navbar with smooth scrolling and section highlighting.

- **Responsive Design:**  
  Fully responsive for desktop and mobile devices.

---
## Screenshots

Explore the key sections of **Videolize** through these screenshots:

| Section   | Preview |
|-----------|---------|
| **Home** (Root) | ![Home](https://github.com/user-attachments/assets/b79a7f5e-db39-4576-a007-0893b05c1e6d) |
| **Me** | ![Me](https://github.com/user-attachments/assets/55f17eba-c15b-48d2-b5f5-c73fcefff587) |
| **About** | ![About](https://github.com/user-attachments/assets/a5eb6d4c-915e-4974-b4cb-f8d3e64a80a9) |
| **Gallery** | ![Gallery](https://github.com/user-attachments/assets/8322a581-7340-4c30-b39f-315259cbe10c) |
| **Projects** | ![Projects](https://github.com/user-attachments/assets/04fc0f8a-b093-4a14-8b27-b5116d907cc5) |
| **Contact** | ![Contact](https://github.com/user-attachments/assets/c71b71d7-8cd0-4aeb-b52d-342b17731b56) |
| **Skills** | ![Skills](https://github.com/user-attachments/assets/f97d924e-4543-4ff4-968d-fa413a90c80f) |
| **More** | ![More](https://github.com/user-attachments/assets/fbddcc78-0ca4-4edb-9930-be4b49966261) |

---

## Project Structure

```
Videolize/
├── src/
│   ├── index.html           # Home page
│   ├── about/               # About Me section
│   ├── skills/              # Skills & Software proficiency
│   ├── projects/            # Projects showcase
│   ├── gallery/             # Gallery page
│   ├── contact/             # Contact page
│   ├── me/                  # Personal bio page
│   ├── 404/                 # Custom 404 page
│   ├── CSS/                 # Stylesheets (modular)
│   ├── JS/                  # JavaScript modules (animations, effects, logic)
│   └── assets/              # Images, icons, etc.
├── README.md
├── PatchNotes.md
├── sitemap.xml
└── ...
```

---

## Technologies Used

- **Frontend:**  
  - HTML5, CSS3 (Tailwind, custom CSS)
  - JavaScript (ES6+)
  - GSAP (GreenSock Animation Platform)
  - Anime.js, ScrollReveal, Snap.svg
  - BentoBox, Glassmorphism, Neumorphism design patterns

- **Backend:**  
  - Firebase (for user data, project info, and social links)

- **Other:**  
  - Smooth scrolling (Locomotive Scroll)
  - LocalStorage API (for scroll memory)
  - Responsive design for all devices

---

## Backend Features

- **Firebase Integration:**  
  - Stores user data and project information.
  - Dynamic time counter showing experience in seconds (real-time growth).
  - Centralized social media links for easy updates.

---

## Interactive Elements

- **Smooth Scrolling:**  
  Internal navigation with animated transitions.

- **Scroll Memory:**  
  Remembers user’s scroll position using localStorage.

- **Lazy Loading:**  
  Optimized image loading for performance.

- **Animated Tiles & Cards:**  
  Interactive project and skill tiles with hover and reveal effects.

- **Custom Animations:**  
  Event-driven and section-based animations for engaging UX.

---

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/circuit-overtime/Videolize.git
   cd Videolize
   ```

2. **Open `src/index.html` in your browser**  
   (No build step required; all dependencies are loaded via CDN.)

3. **(Optional) Configure Firebase:**  
   Update Firebase config in the JS files if you want to use your own backend.

---

## Usage

Visit the live portfolio:  
[Solanki Ghosh Portfolio](https://solanki.elixpo.com)

---

## Contributing

Contributions are welcome!  
Please open an issue or submit a pull request for improvements or new features.

---

## Credits

- **Design & Development:**  
  - Anwesha Chakraborty  
  - Ayushman Bhattacharya  
  - Vivek Yadav


---

## License

This project is licensed under the MIT License.

---
