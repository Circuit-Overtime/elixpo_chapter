'use client';

export default function BlogPreview({ title, subtitle, coverPreview, tags, html }) {
  return (
    <div className="blog-preview">
      {coverPreview && (
        <img
          src={coverPreview}
          alt="Cover"
          className="w-full h-[360px] object-cover rounded-xl mb-6"
        />
      )}

      {title && (
        <h1 className="text-[2em] font-extrabold leading-tight mb-1">{title}</h1>
      )}

      {subtitle && (
        <p className="text-xl text-[#888] mb-4">{subtitle}</p>
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
