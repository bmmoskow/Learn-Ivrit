import { Shield } from 'lucide-react';
import { MarkdownPage } from '@/components/MarkdownPage/MarkdownPage';

export function PrivacyPolicy() {
  return (
    <MarkdownPage
      markdownPath="/PRIVACY_POLICY.md"
      icon={<Shield className="h-8 w-8 text-blue-600" />}
      title="Privacy Policy"
    />
  );
}
