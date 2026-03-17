"use client";

export default function Footer({ profile, person }) {
  return (
    <footer className="w-screen left-1/2 -translate-x-1/2 relative border-t-2 border-[#222] mt-10">
      <div className="footerContent flex flex-col sm:flex-row justify-center sm:justify-around mt-5 h-auto sm:h-[40px] w-full items-center gap-4 sm:gap-0 px-4">
        <p className="footerName select-none text-[#111] text-xl sm:text-2xl md:text-[3em]">
          {profile.siteName.toUpperCase()}
        </p>
        <div className="socials flex flex-row gap-3 sm:gap-5 mt-0 sm:mt-5 h-full items-center">
          {profile.socials.map((social, idx) => (
            <span key={social.platform} className="flex items-center gap-3 sm:gap-5">
              <ion-icon
                name={social.icon}
                class="socialIcon text-lg sm:text-xl md:text-[2em] cursor-pointer hover:rotate-[10deg] transition-[0.25s]"
                onClick={() => window.open(social.url, "_blank")}
                style={{ cursor: "pointer" }}
              />
              {idx < profile.socials.length - 1 && (
                <div className="spacer h-[8px] w-[8px] sm:h-[10px] sm:w-[10px] rounded-[50%] bg-[#111]" />
              )}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
