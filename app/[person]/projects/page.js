import { getPersonContent } from "@/lib/content";
import ContactBanner from "@/components/ContactBanner";
import ComingSoon from "@/components/ComingSoon";

export async function generateMetadata({ params }) {
  const { person } = await params;
  const profile = getPersonContent(person, "profile");
  const title = `${profile.siteName} - Projects`;
  const description = `Projects by ${profile.siteName} — ${profile.siteDescription}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: "/assets/og-image.png", width: 1200, height: 630, alt: profile.siteName }] },
    twitter: { card: "summary_large_image", title, description, images: ["/assets/og-image.png"] },
  };
}

export default async function ProjectsPage({ params }) {
  const { person } = await params;
  const projectsData = getPersonContent(person, "projects");

  return (
    <>
      {/* Header */}
      <div className="headerTextContainer w-full p-2 flex flex-col sm:flex-row h-auto sm:h-[200px] gap-4 sm:gap-10">
        <div className="projectsHeaderText text-2xl sm:text-6xl md:text-[8em] lg:text-[9em] w-full sm:w-1/2 flex justify-center items-center bg-[#1B1B19] text-center opacity-90 select-none rounded-[10px] sm:rounded-[15px] tracking-[3px] sm:tracking-[5px] h-[70px] sm:h-full">
          <p className="text-[#E2D9C8]">{projectsData.heading}</p>
        </div>
        <p className="w-full sm:w-1/2 relative flex-wrap break-words text-[#111] font-bold text-sm sm:text-base md:text-[1.4em]">
          {projectsData.description}
        </p>
      </div>

      {/* Projects List */}
      {projectsData.projects?.length > 0 ? (
        <section className="projectsContainer w-full mt-5 border-t-2 border-[#555] flex flex-col gap-6 sm:gap-10">
          {projectsData.projects.map((data, i) => (
            <div
              key={i}
              className="w-full flex flex-col items-center justify-center gap-1 border-b-2 border-[#222] pb-4 sm:pb-5"
            >
              <div className="px-3 sm:px-5 flex flex-row items-center w-full">
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="projectName font-extrabold text-lg sm:text-xl md:text-[2.3em] text-[#222] underline cursor-pointer underline-offset-[4px] sm:underline-offset-[6px] decoration-[#555] transition-[0.25s] hover:text-[#66460c] font-[Canopee,serif] tracking-wide truncate"
                >
                  {data.name}
                </a>
              </div>
              <div className="w-full px-3 sm:px-5 flex flex-row gap-2 items-center">
                <img
                  src={data.ownerLogo}
                  alt={data.owner}
                  className="h-[16px] w-[16px] sm:h-[20px] sm:w-[20px] rounded-full"
                />
                <p className="text-sm sm:text-[1.2em] text-[#555] font-semibold">
                  from {data.owner}
                </p>
              </div>
              <div className="w-full px-3 sm:px-5 flex flex-col sm:flex-row justify-between gap-1">
                <p className="text-xs sm:text-base md:text-[1.2em] text-[#333] font-semibold w-full sm:w-[70%]">
                  {data.description || "No description provided."}
                </p>
                {data.language && (
                  <span className="text-xs sm:text-[1em] text-[#888] font-mono">{data.language}</span>
                )}
              </div>
              {data.topics.length > 0 && (
                <div className="w-full px-3 sm:px-5 mt-2 flex flex-row items-left justify-left gap-1 sm:gap-2 flex-wrap">
                  {data.topics.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full bg-[#664600] text-[#fff] text-xs sm:text-[0.95em] font-medium border border-[#111]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ) : (
        <ComingSoon title="Projects Coming Soon" />
      )}

      {/* Contact Banner */}
      <ContactBanner person={person} />
    </>
  );
}
