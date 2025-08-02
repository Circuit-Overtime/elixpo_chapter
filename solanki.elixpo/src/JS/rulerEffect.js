const ruler = document.getElementById('ruler');
    const marker = document.getElementById('marker');
    const tileImages = [
    'https://picsum.photos/seed/a/100/60',
    'https://picsum.photos/seed/b/100/60',
    'https://picsum.photos/seed/c/100/60',
    'https://picsum.photos/seed/d/100/60',
    'https://picsum.photos/seed/e/100/60'
    ];
    const totalTicks = 150;
    let velocity = 0;
    let position = 0;
    let lastTileTime = 0;
    let lastPopTime = 0;
    // Fill the ruler
    for (let i = 0; i < totalTicks; i++) {
      const tick = document.createElement('div');
      tick.classList.add('tick');
      if (i % 5 === 0) tick.classList.add('strong');
      ruler.appendChild(tick);
    }

    const wrapper = document.querySelector('.ruler-wrapper');
    const wrapperWidth = wrapper.offsetWidth - 50;

    // Scroll to move marker
    window.addEventListener('wheel', (e) => {
      const delta = Math.sign(e.deltaY);
      velocity += delta * 3; // tuning factor
    }, { passive: false });

    function animateMarker() {
      if (Math.abs(velocity) > 0.01) {
        position += velocity;
        velocity *= 0.9;

        // Clamp position
        const maxPosition = wrapperWidth;
        position = Math.max(50, Math.min(maxPosition, position));

        marker.style.left = `${position}px`;
        createTimePop(position);
        // createTilePop(position)
      }
      requestAnimationFrame(animateMarker);    
    }

    animateMarker();

    function formatTime(position) {
  const seconds = Math.floor((position / wrapperWidth) * 60); // map to 60s range
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
function createTilePop(x) {
  const now = performance.now();
  if (now - lastTileTime < 500) return; // one every 500ms
  lastTileTime = now;

  const tile = document.createElement('div');
  tile.classList.add('tile-pop');

  const img = document.createElement('img');
  img.src = tileImages[Math.floor(Math.random() * tileImages.length)];
  tile.appendChild(img);

  // Decide direction randomly
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? x - 200 : x + 200;
  const endX = x - 60; // Center over marker

  tile.style.left = `${startX}px`;
  tile.style.top = 'calc(50% - 100px)';
  tile.style.opacity = '0';

  document.body.appendChild(tile);

  // Animate into view and glide across marker
  requestAnimationFrame(() => {
    tile.style.transform = `translateX(${fromLeft ? 240 : -240}px) scale(1.05)`;
    tile.style.opacity = '1';
  });

  // Fade out and float away
  setTimeout(() => {
    tile.style.opacity = '0';
    tile.style.transform += ' scale(0.95)';
  }, 1100);

  // Remove from DOM
  setTimeout(() => {
    tile.remove();
  }, 1800);
}


function createTimePop(x) {
  const now = performance.now();
  if (now - lastPopTime < 300) return; 
  lastPopTime = now;

  const pop = document.createElement('div');
  pop.classList.add('time-pop');
  pop.innerText = formatTime(x);

  pop.style.left = `${x + (Math.random() * 20 - 10)}px`;
  pop.style.top = '50%';

  document.getElementById("rulerMapper").appendChild(pop);

  // Trigger animation after append
  requestAnimationFrame(() => {
    pop.style.transform = 'translateY(-100px) scale(1.1)';
    pop.style.opacity = '1';
  });

  // Fade out and remove after 1s
  setTimeout(() => {
    pop.style.opacity = '0';
    pop.style.transform = 'translateY(-140px) scale(0.8)';
  }, 700);

  setTimeout(() => {
    pop.remove();
  }, 1000);
}