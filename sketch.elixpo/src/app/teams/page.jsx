'use client'

import CanvasPageLayout from '@/components/landing/CanvasPageLayout'
import content from '@/content/pages/teams.md'

export default function TeamsPage() {
  return (
    <CanvasPageLayout
      title="Teams & Collaboration"
      description="Share a link, draw together in real time. WebSocket rooms, live cursors, zero setup."
      icon="bx bx-group"
      tags={['collaboration', 'teams', 'real-time']}
      breadcrumbs={[
        { label: 'Teams' },
      ]}
      backHref="/"
      backLabel="Back to Home"
      content={content}
    />
  )
}
