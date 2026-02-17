'use client';

import { useEffect } from 'react';

export default function ContextMenuProtection() {
  useEffect(() => {
    // Create message element for context menu prevention
    const messageEl = document.createElement('p');
    messageEl.id = 'rightClickVouch';
    messageEl.style.position = 'absolute';
    messageEl.style.color = '#ffc';
    messageEl.style.transition = '0.25s';
    messageEl.style.fontFamily = 'gabriola';
    messageEl.style.opacity = '0.2';
    messageEl.style.pointerEvents = 'none';
    messageEl.style.zIndex = '9999';
    document.body.appendChild(messageEl);

    const messages = [
      'sorry!',
      'killed RMB',
      'BAAAM!!',
      'Bruuhh!',
      "doesn't work!!",
      'SIKE!!',
      'dont-cheat',
      "you ain't developer!",
    ];

    const rotations = ['13deg', '-15deg', '25deg', '-25deg', '17deg', '-17deg', '-10deg', '10deg'];

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      const msgIndex = Math.floor(Math.random() * messages.length);
      const rotIndex = Math.floor(Math.random() * rotations.length);

      messageEl.innerHTML = messages[msgIndex];
      messageEl.style.opacity = '0.45';
      messageEl.style.top = `${event.clientY}px`;
      messageEl.style.left = `${event.clientX}px`;
      messageEl.style.transform = `rotate(${rotations[rotIndex]})`;

      const timer = setTimeout(() => {
        messageEl.style.opacity = '0';
      }, 500);

      return false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey && event.code === 'KeyU') ||
        (event.ctrlKey && event.code === 'KeyS') ||
        event.code === 'F12' ||
        (event.ctrlKey && event.code === 'KeyP')
      ) {
        event.preventDefault();
        messageEl.style.opacity = '1';

        const randomX = [
          '253px',
          '193px',
          '1176px',
          '256px',
          '1085px',
          '1298px',
          '420px',
          '328px',
          '149px',
        ];
        const randomY = [
          '179px',
          '365px',
          '551px',
          '542px',
          '316px',
          '281px',
          '175px',
          '470px',
          '565px',
        ];

        messageEl.style.left = randomX[Math.floor(Math.random() * randomX.length)];
        messageEl.style.top = randomY[Math.floor(Math.random() * randomY.length)];

        setTimeout(() => {
          messageEl.style.opacity = '0';
        }, 1000);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
