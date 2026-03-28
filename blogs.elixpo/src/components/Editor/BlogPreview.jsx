'use client';

export default function BlogPreview({ title, subtitle, coverPreview, coverZoom, coverPos, pageEmoji, tags, html, user, wordCount }) {
  return (
    <div className="blog-preview">
      {/* Cover + emoji */}
      <div className="relative mb-2">
        {coverPreview && (
          <div className="rounded-xl overflow-hidden" style={{ height: '220px' }}>
            <img
              src={coverPreview}
              alt="Cover"
              className="w-full h-full object-cover"
              style={{
                objectPosition: `${coverPos?.x ?? 50}% ${coverPos?.y ?? 50}%`,
                transform: `scale(${coverZoom || 1})`,
              }}
            />
          </div>
        )}

        {pageEmoji && (
          <div
            style={{
              position: coverPreview ? 'absolute' : 'relative',
              bottom: coverPreview ? '-24px' : 'auto',
              left: '16px',
              zIndex: 10,
            }}
          >
            <div className="w-[72px] h-[72px] rounded-full bg-[#0e121b] border-[3px] border-[#0e121b] shadow-lg flex items-center justify-center relative">
              <span className="text-[42px] leading-none select-none">{pageEmoji}</span>
              <div className="absolute inset-[-2px] rounded-full border border-[#232d3f]" />
            </div>
          </div>
        )}
      </div>

      {/* Spacer when emoji overlaps cover */}
      {pageEmoji && coverPreview && <div className="h-8" />}

      {title && (
        <h1 className="text-[2em] font-extrabold leading-tight mb-1">{title}</h1>
      )}

      {subtitle && (
        <p className="text-xl text-[#888] mb-4">{subtitle}</p>
      )}

      {/* Author bar */}
      {user && (
        <div className="flex items-center gap-3 mt-3 mb-4">
          <div className="flex -space-x-2">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-[#0e121b]" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#232d3f] border-2 border-[#0e121b] flex items-center justify-center text-[11px] font-bold text-[#9ca3af]">
                {(user.display_name || user.username || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#6b7a8d]">
            <span className="text-[#9ca3af] font-medium">{user.display_name || user.username || 'Author'}</span>
            <span className="text-[#3a3f4f]">·</span>
            <span>{Math.max(1, Math.ceil((wordCount || 0) / 200))} min read</span>
            <span className="text-[#3a3f4f]">·</span>
            <span>{wordCount || 0} {(wordCount || 0) === 1 ? 'word' : 'words'}</span>
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-[#1D202A] rounded-full text-sm text-[#7ba8f0]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        {html ? (
          <div
            className="blog-preview-content max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-[#555] italic">Start writing to see a preview...</p>
        )}
      </div>
    </div>
  );
}
