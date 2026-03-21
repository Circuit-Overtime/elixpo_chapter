"use client";

import { useEffect, useRef, useState } from "react";

export function FadeInReveal() {
  useEffect(() => {
    if (typeof anime === "undefined") return;
    const appContainers = document.querySelectorAll(".appContainer");
    appContainers.forEach((container) => {
      anime({
        targets: container,
        opacity: [0, 1],
        translateY: [60, 0],
        duration: 1200,
        easing: "easeOutExpo",
        complete: () => {
          container.style.opacity = 1;
        },
      });
    });
  }, []);
  return null;
}

export function InertiaScroll() {
  useEffect(() => {
    const appContainer = document.getElementById("appContainer");
    if (!appContainer) return;

    let velocity = 0;
    let isTicking = false;
    const friction = 0.82;
    let frame;

    function startInertia() {
      if (isTicking) return;
      isTicking = true;

      function step() {
        appContainer.scrollTop += velocity;
        velocity *= friction;
        if (Math.abs(velocity) < 0.5) {
          velocity = 0;
          isTicking = false;
          cancelAnimationFrame(frame);
          return;
        }
        frame = requestAnimationFrame(step);
      }
      step();
    }

    const handler = (e) => {
      if (
        e.target.tagName === "TEXTAREA" ||
        (e.target.closest && e.target.closest("textarea"))
      ) {
        return;
      }
      // Let scrollable inner containers (like descriptionRow2) handle their own scroll
      const scrollableParent = e.target.closest && e.target.closest(".overflow-y-auto");
      if (scrollableParent) {
        const { scrollTop, scrollHeight, clientHeight } = scrollableParent;
        const atTop = scrollTop === 0 && e.deltaY < 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
        if (!atTop && !atBottom) return;
      }
      if (!e.shiftKey && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        e.preventDefault();
        velocity += e.deltaY * 0.5;
        startInertia();
      }
    };

    appContainer.addEventListener("wheel", handler, { passive: false });
    return () => {
      appContainer.removeEventListener("wheel", handler);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

export function SpotlightScroller({ children }) {
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const center = container.querySelector("#spotlightCenter");
    if (center) {
      const sl = center.offsetLeft - container.offsetWidth / 2 + center.offsetWidth / 2;
      container.scrollLeft = sl;
    }
  }, []);

  const onMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const onMouseUp = () => setIsDragging(false);
  const onMouseLeave = () => setIsDragging(false);
  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX);
  };

  return (
    <section
      ref={scrollRef}
      className="spotlight relative h-[300px] sm:h-[350px] mb-[20px] px-3 sm:px-6 md:px-[40px] box-border py-[20px] sm:py-[40px] gap-[15px] sm:gap-[20px] overflow-x-auto overflow-y-hidden flex-nowrap flex flex-row select-none"
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      {children}
    </section>
  );
}

export function ScaleContainer() {
  useEffect(() => {
    function scaleAppContainer() {
      const container = document.getElementById("appContainer");
      if (!container) return;
      const maxWidth = 1440;
      const scaleX = window.innerWidth / maxWidth;
      const scaleY = window.innerHeight / window.innerHeight;
      const scale = Math.min(scaleX, scaleY);
      container.style.transform = `translate(-50%, 0) scale(${scale})`;
      container.style.transformOrigin = "top center";
    }

    scaleAppContainer();
    window.addEventListener("resize", scaleAppContainer);
    return () => window.removeEventListener("resize", scaleAppContainer);
  }, []);
  return null;
}
