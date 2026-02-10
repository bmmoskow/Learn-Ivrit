import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";

interface TextInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string) => void;
}

export function TextInputDialog({ open, onOpenChange, onSubmit }: TextInputDialogProps) {
  const [textInputValue, setTextInputValue] = useState("");

  const handleSubmit = () => {
    if (textInputValue.trim()) {
      onSubmit(textInputValue.trim());
      onOpenChange(false);
      setTextInputValue("");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTextInputValue("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>Paste or Type Hebrew or English</DialogTitle>
        </DialogHeader>
        <textarea
          value={textInputValue}
          onChange={(e) => setTextInputValue(e.target.value)}
          placeholder="Type or paste your text here..."
          className="w-full min-h-[200px] p-3 border border-input rounded-md bg-background text-foreground resize-y outline-none focus:ring-2 focus:ring-ring text-base"
          dir="auto"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!textInputValue.trim()}>
            Translate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
