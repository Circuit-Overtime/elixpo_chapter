import { FrameShape } from "@/redux/slices/shapes/index";
import { LiquidGlassButton } from "@/components/button/liquidglassbtn/liquid-glass-btn";
import { Brush, Palette, SparklesIcon } from "lucide-react";
import { useCanvas } from "@/hooks/use-canvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


export const Frame = ({
  shape,
  toggleInspiration,
}: {
  shape: FrameShape;
  toggleInspiration?: () => void;
}) => {
  const { isGenerating, handleGenerateDesign } = useCanvas(shape);

  return (
    <>
      <div
        className="absolute pointer-events-none backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] saturate-150"
        style={{
          left: shape.x,
          top: shape.y,
          width: shape.w,
          height: shape.h,
          borderRadius: "12px", // Slightly more rounded for modern feel
        }}
      />
      <div
        className="absolute font-mono pointer-events-none whitespace-nowrap text-xs font-medium text-white/80 select-none"
        style={{
          left: shape.x,
          top: shape.y - 24, // Position above the frame
          fontSize: "11px",
          lineHeight: "1.2",
        }}>
        Frame {shape.frameNumber}
      </div>
      <div
        className="absolute pointer-events-auto flex gap-2"
        style={{
          left: shape.x + shape.w - 240, // Position at top right, accounting for button width
          top: shape.y - 40, // Position above the frame with some spacing
          zIndex: 1000, // Ensure button is on top
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}>
        
         <Button
          onClick={toggleInspiration}
         disabled={isGenerating}
         size={'sm'}
         className={cn(
          isGenerating ? 'animate-pulse' : "",
          'font-mono rounded-full cursor-pointer border bg-white/5  border-white/10 hover:bg-white/10 text-white/90 text-xs' 
         )}
         variant={'secondary'}
         
        >
          <Palette size={12} />
          Inspiration
        </Button>
        <Button
        onClick={handleGenerateDesign}
        
         size={'sm'}
         className={cn(
          isGenerating ? 'animate-pulse' : "",
          'font-mono rounded-full cursor-pointer border bg-white/5  border-white/10 hover:bg-white/10 text-white/90 text-xs'
         )}
         variant={'secondary'}
         
        >
           <SparklesIcon size={12} className={isGenerating ? "fill-amber-400" : "fill-amber-500"} />
          {
            isGenerating ? "Generating.." : "Generate"
          }
        </Button>
      </div>
    </>
  );
};
