import { Metadata } from 'next';
import CardCreator from '@/components/CardCreator';

export const metadata: Metadata = {
  title: 'Create Birthday Card | LixWish',
  description: 'Create a beautiful, interactive birthday card with special effects',
};

export default function CreatePage() {
  return <CardCreator />;
}
