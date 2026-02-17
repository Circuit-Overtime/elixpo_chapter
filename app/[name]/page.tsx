import { Suspense } from 'react';
import KeyPrompt from '@/components/KeyPrompt';

export async function generateMetadata(props: {
  params: Promise<{ name: string }>;
}) {
  const params = await props.params;
  const name = decodeURIComponent(params.name);

  return {
    title: `${name}'s Birthday Card`,
    description: 'Open this special birthday card with an access key',
  };
}

export default async function CardSlugPage(props: {
  params: Promise<{ name: string }>;
}) {
  const params = await props.params;
  const slug = decodeURIComponent(params.name);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <KeyPrompt slug={slug} />
    </Suspense>
  );
}
