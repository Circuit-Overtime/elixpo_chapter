
const linkedinURL = "https://www.linkedin.com/in/solankighoshvideoeditor"
const imageUrls = [
  'https://images.unsplash.com/photo-1588282322673-c31965a75c3e',
  'https://images.unsplash.com/photo-1588117472013-59bb13edafec',
  'https://images.unsplash.com/photo-1588499756884-d72584d84df5',
  'https://images.unsplash.com/photo-1588492885706-b8917f06df77',
  'https://images.unsplash.com/photo-1588247866001-68fa8c438dd7',
  'https://images.unsplash.com/photo-1586521995568-39abaa0c2311',
  'https://images.unsplash.com/photo-1572914857229-37bf6ee8101c',
  'https://images.unsplash.com/photo-1588453862014-cd1a9ad06a12',
  'https://images.unsplash.com/photo-1588414734732-660b07304ddb',
  'https://images.unsplash.com/photo-1587732608058-5ccfedd3ea63',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308',
  'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca',
  'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca',
  'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca',
  'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429'
];

const gallery = document.getElementById('imageGallery');

imageUrls.forEach((url, i) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'grid-item';

  const img = document.createElement('img');
  img.src = `${url}?auto=format&fit=crop&w=800&q=80`;
  img.alt = `gallery-image-${i}`;
  img.style.opacity = 0;
  img.style.transform = 'translateY(30px)';

  img.onload = () => {
    observer.observe(img);
  };

  wrapper.appendChild(img);
  gallery.appendChild(wrapper);
});

const observer = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      anime({
        targets: entry.target,
        opacity: [0, 1],
        translateY: [30, 0],
        delay: anime.random(100, 500),
        duration: 900,
        easing: 'easeOutExpo'
      });
      obs.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.2
});

document.getElementById("redirectWebsite").addEventListener("click", () => {
  redirectTo("");
})




document.getElementById("linkedinRedirect").addEventListener("click", () => {
  location.href = linkedinURL;
})