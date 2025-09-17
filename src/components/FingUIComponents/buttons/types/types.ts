import React from "react";

export interface ButtonMorphProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode; // user-defined content
  initialRadius?: string;
  morphedRadius?: string;
  initialWidth?: string;
  morphedWidth?: string;
  duration?: number;
  ease?: "easeInOut" | "easeOut" | "easeIn" | "linear";
  startMorphed?: boolean;
  className?: string;
}
