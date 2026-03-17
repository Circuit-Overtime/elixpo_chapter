import { getPersonContent, getValidPersons } from "@/lib/content";
import MenuOverlay from "@/components/MenuOverlay";
import Footer from "@/components/Footer";
import { FadeInReveal, InertiaScroll } from "@/components/Animations";

export async function generateStaticParams() {
  return getValidPersons().map((person) => ({ person }));
}

export async function generateMetadata({ params }) {
  const { person } = await params;
  const profile = getPersonContent(person, "profile");
  return {
    title: `${profile.siteName} - Home`,
    description: `${profile.siteDescription} — ${profile.siteName}'s personal portfolio`,
    openGraph: {
      title: `${profile.siteName} - Home`,
      description: `${profile.siteDescription} — ${profile.siteName}'s personal portfolio`,
      images: [{ url: "/assets/og-image.png", width: 1200, height: 630, alt: profile.siteName }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.siteName} - Home`,
      description: `${profile.siteDescription} — ${profile.siteName}'s personal portfolio`,
      images: ["/assets/og-image.png"],
    },
  };
}

export default async function PersonLayout({ children, params }) {
  const { person } = await params;
  const profile = getPersonContent(person, "profile");

  return (
    <div className="relative min-h-screen bg-white flex flex-col justify-center overflow-hidden">
      <MenuOverlay person={person} menuItems={profile.menuItems} currentPath="" />

      {/* Paper texture overlay */}
      <div
        className="absolute top-0 left-0 w-screen h-screen opacity-55 bg-contain bg-repeat bg-center brightness-[55%] sepia-[65%]"
        style={{ backgroundImage: `url(/assets/${person}/paperTexture.jpg)` }}
      />

      {/* Navbar */}
      <div className="navBar static h-[35px] sm:h-[80px] flex items-center justify-between border-b-2 border-[#888] px-4 sm:px-8 md:px-[50px] box-border mb-[5px]">
        <p className="location text-sm sm:text-lg md:text-[1.5em] z-10">{profile.location}</p>
        <a href={`/${person}`} className="name text-xl sm:text-2xl md:text-[3em] cursor-pointer z-10">
          {profile.siteName}
        </a>
        <ion-icon
          name="list"
          class="cursor-pointer text-lg sm:text-xl md:text-2xl z-10"
          id="scrollInMenu"
          style={{ cursor: "pointer" }}
        />
      </div>

      {/* Main content */}
      <div
        id="appContainer"
        className="appContainer relative top-0 mx-auto max-w-[1440px] h-[calc(100vh-100px)] max-h-[calc(100vh-100px)] overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-10"
      >
        {children}
        <Footer profile={profile} person={person} />
      </div>

      <FadeInReveal />
      <InertiaScroll />
    </div>
  );
}
