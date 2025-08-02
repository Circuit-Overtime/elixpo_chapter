    document.addEventListener("DOMContentLoaded", () => {
        const revealElements = document.querySelectorAll('.reveal');
      
        const observer = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const el = entry.target;
      
              // Use requestIdleCallback for less main-thread blocking
              requestIdleCallback(() => {
                anime({
                  targets: el,
                  opacity: [0, 1],
                  translateY: [40, 0],
                  easing: 'easeOutCubic',
                  duration: 400
                });
              });
      
              el.classList.remove('reveal');
              observer.unobserve(el);
            }
          });
        }, {
          threshold: 0.0005
        });
      
        revealElements.forEach(el => {
          el.style.opacity = 0;
          el.style.transform = 'translateY(40px)';
          el.style.willChange = 'opacity, transform';
          observer.observe(el);
        });
    
    
    
      });

