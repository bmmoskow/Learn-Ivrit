import { usePassageGenerator } from "./usePassageGenerator";
import { PassageGeneratorUI } from "./PassageGeneratorUI";

interface PassageGeneratorProps {
  onPassageGenerated: (passage: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function PassageGenerator({ onPassageGenerated, isOpen, onClose }: PassageGeneratorProps) {
  const state = usePassageGenerator(onPassageGenerated);

  if (!isOpen) return null;

  return (
    <PassageGeneratorUI
      ageLevel={state.ageLevel}
      topic={state.topic}
      isGenerating={state.isGenerating}
      error={state.error}
      onAgeLevelChange={state.setAgeLevel}
      onTopicChange={state.setTopic}
      onGenerate={state.generatePassage}
      onClose={onClose}
    />
  );
}
