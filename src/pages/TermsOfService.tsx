import { FileText } from 'lucide-react';
import { MarkdownPage } from '@/components/MarkdownPage/MarkdownPage';

export function TermsOfService() {
  return (
    <MarkdownPage
      markdownPath="/TERMS_OF_SERVICE.md"
      icon={<FileText className="h-8 w-8 text-blue-600" />}
      title="Terms of Service"
    />
  );
}
