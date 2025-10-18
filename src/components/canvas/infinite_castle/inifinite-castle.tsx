"use client";
import React from "react";
import { useInfiniteCastle } from "@/hooks/use-infinite-castle";
import { cn } from "@/lib/utils";
import ShapesRenderer from "../shapes/shapes-renderer";
import TextSideBar from "../text-sidebar/text-sidebar";

const InfiniteCastle = () => {
  const {
    attachCanvasRef,
    shapes,
    viewport,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    isSidebarOpen,
    hasSelectedText,
    currentTool
  } = useInfiniteCastle();

  return (
   <>
    <TextSideBar isOpen={isSidebarOpen && hasSelectedText} />
     <div
      aria-label="Infinite drawing castle"
      role='application'
      style={{touchAction: 'none'}}
      draggable={false}
       onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      ref={attachCanvasRef}
      onContextMenu={(e) => e.preventDefault()}
      className={
        cn(
            'w-full h-[calc(100vh-10vh)] relative  overflow-hidden select-none z-0',
            {
                'cursor-grabbing': viewport.mode === 'panning',
                'cursor-grab': viewport.mode === 'shiftPanning',
                'cursor-crosshair': currentTool !== 'select' && viewport.mode === 'idle',
                'cursor-default': currentTool === 'select' && viewport.mode === 'idle'
            }
        )
      }
     >
     <div
      style={{
          transform: `translate3d(${viewport.translate.x}px, ${viewport.translate.y}px, 0) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          willChange: 'transform'
        }}
      className="absolute origin-top-left pointer-events-none z-10"

     >
      {
        shapes.map((shape) => (
            <ShapesRenderer shape={shape} key={shape.id} />
        ))
      }
     </div>
     </div>
    </>


  );
};

export default InfiniteCastle;



{/* <div className="w-full h-screen text-white flex items-center justify-center">
      <div
        ref={attachCanvasRef}
        className={cn(
          "relative w-[90%] h-[90%] overflow-hidden border border-gray-600 rounded-md",
          "select-none cursor-crosshair"
        )}
        style={{
          transform: `translate3d(${viewport.translate.x}px, ${viewport.translate.y}px, 0) scale(${viewport.scale})`,
          transformOrigin: "0 0",
        }}
        // ✨ attach the event handlers here
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {shapes.length > 0 ? (
          shapes.map((shape) => (
            <ShapesRenderer
             shape={shape}
             key={shape.id}
            />
          ))
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-gray-500">
            No shapes rendered yet
          </p>
        )}
      </div>
    </div> */}