import { getPersonContent } from "@/lib/content";
import CopyEmail from "@/components/CopyEmail";

export async function generateMetadata({ params }) {
  const { person } = await params;
  const profile = getPersonContent(person, "profile");
  const title = `${profile.siteName} - Connect`;
  const description = `Connect with ${profile.siteName} — ${profile.siteDescription}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: "/assets/og-image.png", width: 1200, height: 630, alt: profile.siteName }] },
    twitter: { card: "summary_large_image", title, description, images: ["/assets/og-image.png"] },
  };
}

export default async function ConnectPage({ params }) {
  const { person } = await params;
  const connectData = getPersonContent(person, "connect");

  return (
    <>
      {/* Header */}
      <section className="flex flex-col items-center justify-center mt-5 sm:mt-10 mb-5 sm:mb-10 px-3">
        <div className="headingText text-2xl sm:text-6xl md:text-[10em] w-full max-w-[900px] h-[70px] sm:h-[160px] md:h-[200px] flex justify-center items-center bg-[#1B1B19] text-center opacity-90 select-none rounded-[10px] sm:rounded-[15px] tracking-[3px] sm:tracking-[5px]">
          <p className="text-[#E2D9C8] font-extrabold scale-y-[1.2]">{connectData.heading}</p>
        </div>
        <p className="descriptionText mt-4 sm:mt-6 text-base sm:text-xl md:text-[2em] text-[#1B1B19] text-center max-w-[900px]">
          {connectData.description}
        </p>
      </section>

      {/* Email Click-to-Copy */}
      <section className="flex flex-col items-center gap-3 sm:gap-4 mt-5 sm:mt-10 mb-5 sm:mb-10 px-3 sm:px-4">
        <h2 className="emailProvoke text-[#1B1B19] text-xl sm:text-[2em] md:text-[2.5em] font-extrabold tracking-wide mb-2 sm:mb-4">
          Mail me directly
        </h2>
        {connectData.emails.map((email) => (
          <CopyEmail key={email} email={email} />
        ))}
      </section>

      {/* Social Links */}
      <section className="flex flex-row flex-wrap justify-center items-center gap-6 sm:gap-10 md:gap-16 mt-5 sm:mt-10 mb-8 sm:mb-16 px-4">
        {connectData.socialLinks.map((social) => (
          <a
            key={social.platform}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center"
          >
            <div className="bg-[#1B1B19] rounded-full p-3 sm:p-5 hover:opacity-80 transition-all duration-300">
              <ion-icon name={social.icon} style={{ fontSize: "2em", color: "#E2D9C8" }}></ion-icon>
            </div>
            <span className="mt-1 sm:mt-2 text-[#1B1B19] text-sm sm:text-[1.1em] font-bold">{social.platform}</span>
          </a>
        ))}
      </section>

      {/* Contact Image — hidden on small screens */}
      {connectData.contactImage && (
        <div className="hidden sm:flex justify-center mb-10">
          <div
            className="bgConnectImage relative h-[250px] sm:h-[350px] w-[250px] sm:w-[350px] bg-cover bg-center rounded-[12px] opacity-55 mix-blend-darken border-2 border-[#222]"
            style={{ backgroundImage: `url(${connectData.contactImage})` }}
          />
        </div>
      )}

      {/* Separator */}
      <div className="w-full border-t-2 border-[#222] mt-5 sm:mt-10" />
    </>
  );
}
