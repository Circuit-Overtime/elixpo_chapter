'use client';

import { useState } from 'react';
import AppShell from './components/AppShell';

const TOPICS = [
  { label: 'For You', icon: 'sparkles', active: true },
  { label: 'Following', icon: null },
  { label: 'Web Development', icon: null },
  { label: 'Machine Learning', icon: null },
  { label: 'DevOps', icon: null },
  { label: 'System Design', icon: null },
  { label: 'Open Source', icon: null },
  { label: 'Startups', icon: null },
];

const MOCK_POSTS = [
  {
    id: 1,
    org: 'Write A Catalyst',
    author: 'Dr. Patricia Schmidt',
    title: 'As a Neuroscientist, I Quit These 5 Morning Habits That Destroy Your Brain',
    subtitle: 'Most people do #1 within 10 minutes of waking (and it sabotages your entire day)',
    date: 'Jan 15',
    likes: '41K',
    comments: '780',
    tag: 'Neuroscience',
  },
  {
    id: 2,
    org: 'Generative AI',
    author: 'Adham Khaled',
    title: 'Stanford Just Killed Prompt Engineering With 8 Words (And I Can\'t Believe It Worked)',
    subtitle: 'ChatGPT keeps giving you the same boring response? This new technique unlocks 2x more creativity from ANY AI model',
    date: 'Oct 20',
    likes: '25K',
    comments: '685',
    tag: 'AI',
  },
  {
    id: 3,
    org: 'Level Up Coding',
    author: 'Kusireddy',
    title: 'I Stopped Using ChatGPT for 30 Days. What Happened to My Brain Was Terrifying.',
    subtitle: '91% of you will abandon 2026 resolutions by January 10th. Here\'s how to be in the 9% who actually win.',
    date: 'Dec 28',
    likes: '11.7K',
    comments: '430',
    tag: 'Productivity',
  },
  {
    id: 4,
    org: null,
    author: 'Jacob Bennett',
    title: 'The 5 paid subscriptions I actually use in 2026 as a Staff Software Engineer',
    subtitle: 'Tools that are (usually) cheaper than Netflix',
    date: 'Mar 5',
    likes: '8.2K',
    comments: '312',
    tag: 'Engineering',
  },
  {
    id: 5,
    org: 'Better Programming',
    author: 'Sarah Chen',
    title: 'Why Every Senior Dev I Know Is Mass-Deleting Their npm Packages',
    subtitle: 'The supply chain attack that changed everything about how we think about dependencies',
    date: 'Mar 12',
    likes: '6.4K',
    comments: '201',
    tag: 'Security',
  },
];

const STAFF_PICKS = [
  { id: 1, author: 'L. Marie Dare', org: 'Modern Women', title: 'I Tried Standup Comedy in Midlife \u2014 and Immediately Froze', date: '2d ago' },
  { id: 2, author: 'Amanda Amble', org: null, title: 'Not Everyone Wants a Dead Mouse in the Mail', date: '3d ago' },
  { id: 3, author: 'Arpad Nagy', org: 'The Memoirist', title: 'My Father Died at 58, and I Never Knew That He Was Young', date: '5d ago' },
];

const RECOMMENDED_TOPICS = [
  'Programming', 'Self Improvement', 'Data Science', 'Writing',
  'Relationships', 'Technology', 'Politics', 'Design',
];

function FeedCard({ post }) {
  return (
    <article className="group py-7 border-b border-[#1a1d27] last:border-b-0 cursor-pointer">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-full bg-[#2a2d3a] flex-shrink-0" />
        <span className="text-[13px] text-[#b0b0b0]">
          {post.org && <><span className="text-[#c8c8c8] hover:underline">in {post.org}</span><span className="mx-1.5 text-[#555]">&middot;</span></>}
          <span className="text-[#c8c8c8] hover:underline">{post.author}</span>
        </span>
      </div>
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-[20px] font-bold text-[#e8e8e8] leading-[1.3] mb-1.5 group-hover:text-white transition-colors font-serif tracking-[-0.01em]">
            {post.title}
          </h2>
          <p className="text-[15px] text-[#888] leading-[1.5] line-clamp-2 mb-4">
            {post.subtitle}
          </p>
          <div className="flex items-center gap-4 text-[13px] text-[#777]">
            <span className="text-[#9b7bf7] text-[12px] bg-[#9b7bf714] px-2.5 py-0.5 rounded-full font-medium">{post.tag}</span>
            <span>{post.date}</span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              {post.likes}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {post.comments}
            </span>
            <span className="ml-auto flex items-center gap-3">
              <button className="hover:text-[#b0b0b0] transition-colors p-1" title="Save">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
              </button>
              <button className="hover:text-[#b0b0b0] transition-colors p-1" title="More">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
              </button>
            </span>
          </div>
        </div>
        <div className="w-[120px] h-[120px] bg-[#1a1d27] rounded-md flex-shrink-0 hidden sm:block" />
      </div>
    </article>
  );
}

function StaffPickCard({ pick }) {
  return (
    <div className="py-4 cursor-pointer group">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-5 w-5 rounded-full bg-[#2a2d3a] flex-shrink-0" />
        <span className="text-[12px] text-[#b0b0b0]">
          {pick.org && <><span className="hover:underline">in {pick.org}</span><span className="mx-1 text-[#555]">&middot;</span></>}
          <span className="hover:underline">{pick.author}</span>
        </span>
      </div>
      <h3 className="text-[15px] font-bold text-[#d0d0d0] leading-[1.35] group-hover:text-white transition-colors font-serif">
        {pick.title}
      </h3>
      <span className="text-[12px] text-[#666] mt-1 block">{pick.date}</span>
    </div>
  );
}

export default function App() {
  const [activeTopic, setActiveTopic] = useState(0);

  return (
    <AppShell>
      <div className="flex">
        {/* Center Feed */}
        <div className="flex-1 min-w-0 border-r border-[#1a1d27]">
          {/* Topic Tabs */}
          <div className="sticky top-14 z-40 bg-[#030712]/95 backdrop-blur-md border-b border-[#1a1d27]">
            <div className="flex items-center gap-0 px-6 overflow-x-auto scrollbar-none">
              {TOPICS.map((topic, i) => (
                <button
                  key={topic.label}
                  onClick={() => setActiveTopic(i)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    i === activeTopic
                      ? 'text-white border-white'
                      : 'text-[#777] border-transparent hover:text-[#b0b0b0] hover:border-[#333]'
                  }`}
                >
                  {topic.icon && <ion-icon name={topic.icon} style={{ fontSize: '14px' }} />}
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Cards */}
          <div className="px-6">
            {MOCK_POSTS.map((post) => (
              <FeedCard key={post.id} post={post} />
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-[340px] flex-shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto px-8 py-6 scrollbar-thin">
          {/* Staff Picks */}
          <div className="mb-8">
            <h3 className="text-[14px] font-bold text-[#e0e0e0] mb-1 tracking-wide">Staff Picks</h3>
            <div className="divide-y divide-[#1a1d27]">
              {STAFF_PICKS.map((pick) => (
                <StaffPickCard key={pick.id} pick={pick} />
              ))}
            </div>
            <button className="text-[13px] text-[#9b7bf7] hover:text-[#b69aff] transition-colors mt-2 font-medium">
              See the full list
            </button>
          </div>

          {/* Recommended Topics */}
          <div className="mb-8">
            <h3 className="text-[14px] font-bold text-[#e0e0e0] mb-3 tracking-wide">Recommended Topics</h3>
            <div className="flex flex-wrap gap-2">
              {RECOMMENDED_TOPICS.map((topic) => (
                <button
                  key={topic}
                  className="px-3.5 py-1.5 rounded-full text-[13px] text-[#b0b0b0] bg-[#0d1117] border border-[#1a1d27] hover:border-[#333] hover:text-white transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Writing Prompt */}
          <div className="bg-[#0d1117] border border-[#1a1d27] rounded-xl p-5">
            <h3 className="text-[14px] font-bold text-[#e0e0e0] mb-1">Writing on LixBlogs</h3>
            <ul className="text-[13px] text-[#888] space-y-1.5 mt-3">
              <li className="hover:text-[#b0b0b0] cursor-pointer transition-colors">New to LixBlogs? Start here</li>
              <li className="hover:text-[#b0b0b0] cursor-pointer transition-colors">Read LixBlogs writing tips</li>
              <li className="hover:text-[#b0b0b0] cursor-pointer transition-colors">Get practical writing advice</li>
            </ul>
            <button
              onClick={() => window.location.href = '/new-blog'}
              className="inline-block mt-4 px-5 py-2 text-[13px] font-medium text-[#030712] bg-[#e8e8e8] hover:bg-white rounded-full transition-colors"
            >
              Start writing
            </button>
          </div>

          {/* Footer Links */}
          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#555]">
            <span className="hover:text-[#888] cursor-pointer transition-colors">Help</span>
            <span className="hover:text-[#888] cursor-pointer transition-colors">Status</span>
            <span className="hover:text-[#888] cursor-pointer transition-colors">About</span>
            <span className="hover:text-[#888] cursor-pointer transition-colors">Blog</span>
            <span className="hover:text-[#888] cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-[#888] cursor-pointer transition-colors">Terms</span>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
