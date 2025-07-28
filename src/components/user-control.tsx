"use client";
import React from "react";
import { UserButton } from "@clerk/nextjs";

interface Props {
  showName?: boolean;
}

const UserControl = ({ showName }: Props) => {
  return (
    <UserButton
      showName={showName}
      afterSignOutUrl="/"
      appearance={{
        elements: {
          // Button container
          userButtonTrigger:
            "flex items-center gap-3 px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 transition duration-300",

          // Avatar box - increased size, no ring
          avatarBox: "w-12 h-12 rounded-full",

          // User name
          userButtonName: "text-base font-medium text-white",

          // Dropdown
          userButtonPopoverCard:
            "rounded-lg shadow-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800",

          userButtonPopoverHeader:
            "px-4 pt-4 pb-2 text-xs text-gray-500 uppercase tracking-wide",

          userButtonPopoverActionButton:
            "w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-md text-sm",

          userButtonPopoverActionButtonText: "text-sm font-normal",
        },
      }}
    />
  );
};

export default UserControl;
