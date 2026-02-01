import { useWordDefinitionPopup } from "./useWordDefinitionPopup";
import { WordDefinitionPopupUI } from "./WordDefinitionPopupUI";
import { WordDefinitionPopupProps } from "./wordDefinitionPopupUtils";

export function WordDefinitionPopup({ word, position, onClose, onWordSaved }: WordDefinitionPopupProps) {
  const {
    currentWord,
    definition,
    loading,
    saving,
    saved,
    error,
    isGuest,
    hasValidDefinition,
    setCurrentWord,
    handleRefresh,
    saveToVocabulary,
  } = useWordDefinitionPopup({ word, onWordSaved });

  return (
    <WordDefinitionPopupUI
      currentWord={currentWord}
      definition={definition}
      loading={loading}
      saving={saving}
      saved={saved}
      error={error}
      isGuest={isGuest}
      hasValidDefinition={hasValidDefinition}
      position={position}
      onClose={onClose}
      onRefresh={handleRefresh}
      onWordClick={setCurrentWord}
      onSave={saveToVocabulary}
    />
  );
}
