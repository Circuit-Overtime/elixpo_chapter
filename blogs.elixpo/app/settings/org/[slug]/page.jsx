'use client';

import { use } from 'react';
import OrgManagePage from '../../../../src/pages/settings/OrgManagePage';

export default function OrgSettings({ params }) {
  const { slug } = use(params);
  return <OrgManagePage slug={slug} />;
}
