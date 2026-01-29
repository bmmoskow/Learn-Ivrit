import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { FAQContent } from './FAQContent';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FAQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FAQDialog({ open, onOpenChange }: FAQDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-white">
        <ScrollArea className="h-[calc(85vh-4rem)] pr-4">
          <FAQContent />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
