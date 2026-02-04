import { HelpCircle } from 'lucide-react';
import { MarkdownPage } from '@/components/MarkdownPage/MarkdownPage';

export function FAQ() {
  return (
    <MarkdownPage
      markdownPath="/FAQ.md"
      icon={<HelpCircle className="h-8 w-8 text-blue-600" />}
      title="Frequently Asked Questions"
    />
  );
}
