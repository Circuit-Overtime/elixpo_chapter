import BackgroundDecorations from './components/shared/BackgroundDecorations';
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import ShowcaseStrip from './components/ShowcaseStrip/ShowcaseStrip';
import Features from './components/Features/Features';
import BlueprintsPreview from './components/BlueprintsPreview/BlueprintsPreview';
import Ecosystem from './components/Ecosystem/Ecosystem';
import CallToAction from './components/CallToAction/CallToAction';
import Footer from './components/Footer/Footer';

export default function Home() {
  return (
    <>
      <BackgroundDecorations />
      <Navbar />
      <main>
        <Hero />
        <ShowcaseStrip />
        <Features />
        <BlueprintsPreview />
        <Ecosystem />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
