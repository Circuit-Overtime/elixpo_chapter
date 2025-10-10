import { MoodboardImageProps } from "@/redux/api/moodboard";
import { ImageIcon, PlusCircle } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

type MoodboardProps = {
  moodboardGuide: MoodboardImageProps[];
};

const MoodBoardContent = ({ moodboardGuide }: MoodboardProps) => {
  const isEmpty = !moodboardGuide || moodboardGuide.length === 0;

  return (
    <div className="flex flex-col gap-10 relative">
      {isEmpty ? (
        // 🌫️ Empty state
        <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-3xl p-12 text-center transition-all duration-200 min-h-[500px] flex items-center justify-center overflow-hidden">
          {/* Pattern background only inside */}
          <div
            className="absolute inset-0 -z-10
              bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)]
              dark:bg-[radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1px)]
              [background-size:18px_18px]"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-20 rounded-3xl" />

          <div className="relative flex flex-col items-center text-muted-foreground">
            <ImageIcon className="w-12 h-12 mb-3 opacity-70" />
            <h3
              className="font-black text-2xl text-foreground"
              style={{ fontFamily: "var(--font-montserrat-alternates)" }}
            >
              No Moodboard Images Yet
            </h3>
            <p className="text-sm font-mono opacity-60 max-w-md mt-2">
              Upload some inspirational images to start building your AI-powered
              moodboard. They’ll appear here as part of your visual identity.
            </p>

            <button className="mt-6 inline-flex items-center gap-2 border border-border px-5 py-2 rounded-full text-sm font-mono hover:bg-muted transition">
              <PlusCircle className="w-4 h-4" />
              Upload Images
            </button>
          </div>
        </div>
      ) : (
        // 🖼️ Moodboard Grid
        <div className="relative rounded-3xl p-8 border border-border/20 overflow-hidden">
          {/* Pattern background inside moodboard */}
          <div
            className="absolute inset-0 -z-10
              bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)]
              dark:bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)]
              [background-size:18px_18px]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {moodboardGuide.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "relative group overflow-hidden rounded-2xl border border-border/20 shadow-sm hover:shadow-md transition-all duration-200"
                )}
              >
                {/* Uncomment when image data is available */}
                {/* <img
                  src={item.url || "/placeholder.jpg"}
                  alt={item.name || `moodboard-${index}`}
                  className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                /> */}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl" />

                {/* Caption */}
                <div className="absolute bottom-3 left-3 text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                  {/* <p className="font-mono text-sm">{item.name || "Untitled"}</p> */}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodBoardContent;
