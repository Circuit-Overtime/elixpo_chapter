"use client";

import { useCallback, useRef } from "react";

export default function MenuOverlay({ person, menuItems, currentPath }) {
  const canvasRef = useRef(null);
  const menuRef = useRef(null);
  const appRef = useRef(null);
  const curtainRef = useRef(null);

  const getActiveMenu = useCallback(() => {
    if (currentPath === `/${person}` || currentPath === `/${person}/`) return "Home";
    for (const item of menuItems) {
      if (item === "Home") continue;
      if (currentPath.includes(`/${person}/${item.toLowerCase()}`)) return item;
    }
    return "";
  }, [currentPath, person, menuItems]);

  const openMenu = useCallback(async () => {
    const canvas = canvasRef.current;
    const revealedSection = menuRef.current;
    if (!canvas || !revealedSection || typeof anime === "undefined") return;

    const initialContent = document.getElementById("appContainer");
    if (!initialContent) return;

    // Load curtain effect lazily
    if (!curtainRef.current) {
      try {
        // Load curtain2.js as external script (it uses ESM imports from unpkg)
        const LiquidPaintEffect = await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.type = "module";
          script.textContent = `
            import LiquidPaintEffect from "/js/curtain2.js";
            window.__LiquidPaintEffect = LiquidPaintEffect;
            window.dispatchEvent(new Event("curtain-loaded"));
          `;
          window.addEventListener("curtain-loaded", () => resolve(window.__LiquidPaintEffect), { once: true });
          script.onerror = reject;
          document.head.appendChild(script);
        });
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        curtainRef.current = new LiquidPaintEffect(canvas, {
          color: "#1D1D1B",
          background: "#E2D9C8",
          backgroundOpacity: 1,
          ease: "power3.inOut",
          duration: 3.5,
          horizontal: true,
          amplitude: 0.2,
          paintNoiseFrequency: 6.0,
          paintNoiseAmplitude: 0.05,
          flowCurveFrequency: 1.5,
          flowCurveAmplitude: 0.05,
          initialProgress: 0,
          brushInitialOpacity: 0,
        });
      } catch {
        // Fallback: just show menu without curtain
      }
    }

    revealedSection.style.display = "flex";
    revealedSection.style.opacity = "0";
    revealedSection.style.pointerEvents = "all";
    revealedSection.style.zIndex = "200";

    const applyCanvasFullscreenStyle = () => {
      canvas.style.display = "block";
      canvas.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 100vw !important; height: 100vh !important;
        visibility: visible; pointer-events: auto;
        z-index: 100; opacity: 0; will-change: opacity;
      `;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    if (curtainRef.current) {
      applyCanvasFullscreenStyle();
      await anime({ targets: canvas, opacity: 1, duration: 400, easing: "easeOutCubic" }).finished;
      await anime({ targets: initialContent, opacity: 0, duration: 400, easing: "easeInOutSine" }).finished;

      await Promise.all([
        anime({ targets: curtainRef.current.curtain.uniforms.uProgress, value: 1, duration: 1200, easing: "easeOutCubic" }).finished,
        anime({ targets: curtainRef.current.curtain.uniforms.uBrushOpacity, value: 1, duration: 1000, easing: "easeOutCubic" }).finished,
      ]);
    }

    await anime({ targets: revealedSection, opacity: 1, duration: 600, easing: "easeOutExpo" }).finished;
    await anime({
      targets: revealedSection.querySelectorAll(".menuItem"),
      opacity: 1,
      delay: anime.stagger(100),
      duration: 200,
      easing: "easeOutSine",
    }).finished;

    if (curtainRef.current) {
      await Promise.all([
        anime({ targets: curtainRef.current.curtain.uniforms.uProgress, value: 0, duration: 1000, easing: "easeInOutQuad" }).finished,
        anime({ targets: curtainRef.current.curtain.uniforms.uBrushOpacity, value: 0, duration: 800, easing: "easeInQuad" }).finished,
      ]);
      await anime({ targets: canvas, opacity: 0, duration: 500, easing: "easeOutCubic" }).finished;
      canvas.style.display = "none";
    }
  }, []);

  const closeMenu = useCallback(async () => {
    const canvas = canvasRef.current;
    const revealedSection = menuRef.current;
    if (!revealedSection || typeof anime === "undefined") return;

    const initialContent = document.getElementById("appContainer");
    if (!initialContent) return;

    const menuItemEls = revealedSection.querySelectorAll(".menuItem");
    await anime({
      targets: menuItemEls,
      opacity: 0,
      delay: anime.stagger(50, { direction: "reverse" }),
      duration: 150,
      easing: "easeInQuad",
    }).finished;

    if (curtainRef.current && canvas) {
      canvas.style.display = "block";
      canvas.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 100vw !important; height: 100vh !important;
        visibility: visible; pointer-events: auto;
        z-index: 300; opacity: 0; will-change: opacity;
      `;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      await Promise.all([
        anime({ targets: canvas, opacity: 1, duration: 400, easing: "easeInOutCubic" }).finished,
        anime({
          targets: revealedSection,
          opacity: 0,
          duration: 400,
          easing: "easeInOutSine",
          complete: () => {
            revealedSection.style.pointerEvents = "none";
            revealedSection.style.display = "none";
          },
        }).finished,
      ]);

      curtainRef.current.curtain.uniforms.uProgress.value = 1;
      curtainRef.current.curtain.uniforms.uBrushOpacity.value = 1;

      await Promise.all([
        anime({ targets: curtainRef.current.curtain.uniforms.uProgress, value: 0, duration: 1000, easing: "easeInOutCubic" }).finished,
        anime({ targets: curtainRef.current.curtain.uniforms.uBrushOpacity, value: 0, duration: 800, easing: "easeInQuad" }).finished,
      ]);
    } else {
      await anime({
        targets: revealedSection,
        opacity: 0,
        duration: 400,
        easing: "easeInOutSine",
        complete: () => {
          revealedSection.style.pointerEvents = "none";
          revealedSection.style.display = "none";
        },
      }).finished;
    }

    initialContent.style.pointerEvents = "all";
    await Promise.all([
      anime({ targets: initialContent, opacity: 1, duration: 500, easing: "easeOutCubic" }).finished,
      canvas ? anime({ targets: canvas, opacity: 0, duration: 500, easing: "easeOutCubic" }).finished : Promise.resolve(),
    ]);

    if (canvas) canvas.style.display = "none";
  }, []);

  const handleMenuClick = useCallback(
    async (item) => {
      const revealedSection = menuRef.current;
      const canvas = canvasRef.current;
      if (!revealedSection || typeof anime === "undefined") return;

      const menuItemEls = revealedSection.querySelectorAll(".menuItem");
      await anime({
        targets: menuItemEls,
        opacity: 0,
        delay: anime.stagger(50, { direction: "reverse" }),
        duration: 150,
        easing: "easeInQuad",
      }).finished;

      if (curtainRef.current && canvas) {
        canvas.style.display = "block";
        canvas.style.cssText = `
          position: fixed; top: 0; left: 0;
          width: 100vw !important; height: 100vh !important;
          visibility: visible; pointer-events: auto;
          z-index: 300; opacity: 0; will-change: opacity;
        `;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        await anime({ targets: canvas, opacity: 1, duration: 400, easing: "easeInOutCubic" }).finished;
        await anime({ targets: revealedSection, opacity: 0, duration: 400, easing: "easeInOutSine" }).finished;

        curtainRef.current.curtain.uniforms.uProgress.value = 1;
        curtainRef.current.curtain.uniforms.uBrushOpacity.value = 1;

        await Promise.all([
          anime({ targets: curtainRef.current.curtain.uniforms.uProgress, value: 0, duration: 1000, easing: "easeInOutCubic" }).finished,
          anime({ targets: curtainRef.current.curtain.uniforms.uBrushOpacity, value: 0, duration: 800, easing: "easeInQuad" }).finished,
        ]);

        await anime({ targets: canvas, opacity: 0, duration: 500, easing: "easeOutCubic" }).finished;
        canvas.style.display = "none";
      }

      revealedSection.style.display = "none";
      revealedSection.style.pointerEvents = "none";

      const target = item === "Home" ? "" : item.toLowerCase();
      window.location.href = `/${person}/${target}`;
    },
    [person]
  );

  const activeMenu = getActiveMenu();

  // Attach click handler to the navbar menu icon
  const attachMenuTrigger = useCallback((node) => {
    if (!node) return;
    const icon = document.getElementById("scrollInMenu");
    if (icon) {
      icon.onclick = openMenu;
    }
  }, [openMenu]);

  return (
    <>
      <canvas ref={canvasRef} id="above-canvas" style={{ display: "none" }} />
      <div ref={attachMenuTrigger} style={{ display: "none" }} />

      {/* Menu overlay */}
      <div
        ref={menuRef}
        id="menuSection"
        className="menuSection bg-[#1D1D1B] h-full w-full fixed top-0 left-0 z-50 flex flex-col items-center justify-center gap-0 sm:gap-3 text-[#E2D9C8] text-lg sm:text-xl md:text-[2em] font-extrabold tracking-widest"
        style={{ display: "none", opacity: 0, pointerEvents: "none" }}
      >
        <div className="navBar absolute top-0 h-[80px] w-full flex items-center justify-between px-4 sm:px-8 md:px-[50px] box-border mb-[13px]">
          <ion-icon
            name="close"
            id="scrollOutMenu"
            class="absolute right-[20px] sm:right-[30px] cursor-pointer hover:text-[#ffc300] transition-[0.25s] text-xl sm:text-2xl md:text-[1.5em]"
            onClick={closeMenu}
            style={{ cursor: "pointer" }}
          />
        </div>
        {menuItems.map((item) => (
          <div
            key={item}
            className={`menuItem cursor-pointer opacity-0 font-extrabold text-7xl sm:text-7xl md:text-8xl lg:text-[5em] leading-[1.1] sm:leading-[110px] md:leading-[130px] hover:scale-105 hover:tracking-[0.03em] transition-all duration-300 text-center uppercase mt-0 mb-0 tracking-[-0.05em] font-[Canopee,sans-serif] ${
              activeMenu === item ? "selected" : ""
            }`}
            onClick={() => handleMenuClick(item)}
          >
            {item}
          </div>
        ))}
      </div>
    </>
  );
}
