'use client';

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

export default function MediaStorageChip({ status, returnTo = '/settings?tab=integrations' }) {
  if (status?.unavailable) return null;
  if (!status || status.loading) {
    return <div className="media-storage-chip media-storage-chip--loading" aria-hidden="true" />;
  }

  const personal = status.connected && status.useForUploads;
  const percent = clampPercent(status.percent);
  const connectHref = `/api/integrations/cloudinary/connect?next=${encodeURIComponent(returnTo)}`;
  const settingsHref = '/settings?tab=integrations';

  return (
    <div
      className={`media-storage-chip ${personal ? 'media-storage-chip--personal' : percent >= 85 ? 'media-storage-chip--warning' : ''}`}
      contentEditable={false}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span className="media-storage-chip__icon" aria-hidden="true">
        <ion-icon name={personal ? 'cloud-done-outline' : 'server-outline'} />
      </span>
      <span className="media-storage-chip__copy">
        <strong>{personal ? status.cloudName : 'LixBlogs storage'}</strong>
        <small>{personal ? 'Personal Cloudinary' : `${status.remainingFormatted} remaining`}</small>
      </span>
      {!personal && (
        <span className="media-storage-chip__meter" aria-label={`${percent}% of LixBlogs storage used`}>
          <span style={{ width: `${percent}%` }} />
        </span>
      )}
      {!status.connected ? (
        <a href={connectHref} className="media-storage-chip__action">Connect Cloudinary</a>
      ) : !personal ? (
        <a href={settingsHref} className="media-storage-chip__action">Use {status.cloudName}</a>
      ) : null}
    </div>
  );
}
