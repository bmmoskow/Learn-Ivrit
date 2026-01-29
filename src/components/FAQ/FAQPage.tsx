import { FAQContent } from './FAQContent';

export function FAQPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <FAQContent />
      </div>
    </div>
  );
}
