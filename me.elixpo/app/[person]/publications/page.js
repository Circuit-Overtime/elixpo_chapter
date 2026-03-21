import { getPersonContent } from "@/lib/content";
import ContactBanner from "@/components/ContactBanner";
import ComingSoon from "@/components/ComingSoon";

export async function generateMetadata({ params }) {
  const { person } = await params;
  const profile = getPersonContent(person, "profile");
  const title = `${profile.siteName} - Publications`;
  const description = `Publications by ${profile.siteName} — ${profile.siteDescription}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: "/assets/og-image.png", width: 1200, height: 630, alt: profile.siteName }] },
    twitter: { card: "summary_large_image", title, description, images: ["/assets/og-image.png"] },
  };
}

export default async function PublicationsPage({ params }) {
  const { person } = await params;
  const pubs = getPersonContent(person, "publications");

  return (
    <>
      {/* Header */}
      <section className="introSection mt-5 px-3 sm:px-6 md:px-10 flex flex-col items-center w-full">
        <div className="headingText text-2xl sm:text-6xl md:text-[10em] lg:text-[13em] w-full h-[70px] sm:h-[250px] md:h-[350px] flex justify-center items-center bg-[#1B1B19] text-center opacity-90 select-none rounded-[10px] sm:rounded-[15px] tracking-[3px] sm:tracking-[5px]">
          <p className="text-[#E2D9C8] transform scale-y-[1.6]">{pubs.heading}</p>
        </div>
        <div className="descriptionText text-lg sm:text-2xl md:text-[3em] lg:text-[5em] mt-3 sm:mt-5 w-full text-left leading-snug sm:leading-[50px] md:leading-[80px]">
          <p className="text-[#1B1B19]">{pubs.description}</p>
        </div>
      </section>

      {/* Pre-publication images — hidden on mobile */}
      {pubs.images?.length > 0 && (
        <section className="prePublication relative mt-5 p-3 sm:p-6 md:p-10 hidden sm:flex flex-row w-full justify-center gap-5">
          {pubs.images.map((img, i) => (
            <div
              key={i}
              className="stampImage bg-cover bg-center h-[300px] sm:h-[500px] md:h-[750px] w-1/2 rounded-[10px] sepia-[65%] saturate-[200%] border-2 border-[#222]"
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
        </section>
      )}

      {/* Publications List */}
      {pubs.papers?.length > 0 ? (
        <section className="publications mt-5 p-3 sm:p-6 md:p-10 flex flex-col items-left w-full gap-3 sm:gap-5 overflow-hidden">
          {pubs.papers.map((pub, index) => (
            <div
              key={index}
              className="relative min-h-[50px] sm:min-h-[60px] w-full flex flex-col sm:flex-row items-start sm:items-center justify-between border-t-2 border-b-2 border-[#111] px-3 sm:px-6 py-2 sm:py-3 gap-2 sm:gap-0"
            >
              <div className="flex-1 flex items-center overflow-hidden">
                <p className="paperTitle font-extrabold text-sm sm:text-lg md:text-xl lg:text-2xl text-left tracking-[1px] sm:tracking-[2px] sm:truncate">
                  {pub.title}
                </p>
              </div>
              <div className="flex flex-row gap-2 sm:gap-3 items-center flex-shrink-0">
                <p className="paperDate text-[#222] text-sm sm:text-lg md:text-xl font-bold whitespace-nowrap">
                  {pub.year}
                </p>
                {pub.isNew && (
                  <span className="newTag flex h-[24px] sm:h-[28px] px-2 text-xs sm:text-sm md:text-base text-[#ffc] bg-[#B63B12] items-center justify-center rounded-[5px]">
                    NEW
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <ComingSoon title="Papers Coming Soon" />
      )}

      {/* Contact Banner */}
      <ContactBanner person={person} />
    </>
  );
}
