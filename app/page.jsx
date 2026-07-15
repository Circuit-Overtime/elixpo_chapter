import App from '../src/index';

export const metadata = {
  // Absolute: this is the landing page, so it carries the full brand statement and
  // must not pick up the "%s | LixBlogs" template on top of it.
  title: { absolute: 'LixBlogs: Read, write and publish beautifully' },
  description:
    'Discover stories, ideas and expertise from writers on every topic. LixBlogs is a modern publishing platform with a powerful block editor, real-time collaboration and organizations, built for writers, developers and teams.',
  alternates: { canonical: 'https://blogs.elixpo.com' },
};

export default function Home() {
  return <App />;
}
