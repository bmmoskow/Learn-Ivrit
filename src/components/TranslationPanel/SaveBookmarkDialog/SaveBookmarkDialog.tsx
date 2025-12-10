import { useSaveBookmarkDialog } from "./useSaveBookmarkDialog";
import { SaveBookmarkDialogUI } from "./SaveBookmarkDialogUI";

interface SaveBookmarkDialogProps {
  hebrewText: string;
  source: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SaveBookmarkDialog({ hebrewText, source, onClose, onSaved }: SaveBookmarkDialogProps) {
  const hook = useSaveBookmarkDialog({ hebrewText, source, onClose, onSaved });

  return (
    <SaveBookmarkDialogUI
      bookmarkName={hook.bookmarkName}
      selectedFolderId={hook.selectedFolderId}
      showNewFolder={hook.showNewFolder}
      newFolderName={hook.newFolderName}
      saving={hook.saving}
      error={hook.error}
      source={source}
      rootFolders={hook.rootFolders}
      setBookmarkName={hook.setBookmarkName}
      setSelectedFolderId={hook.setSelectedFolderId}
      setNewFolderName={hook.setNewFolderName}
      setShowNewFolder={hook.setShowNewFolder}
      onClose={onClose}
      handleSave={hook.handleSave}
      handleCreateFolder={hook.handleCreateFolder}
      cancelNewFolder={hook.cancelNewFolder}
      getSubfolders={hook.getSubfolders}
      isExpanded={hook.isExpanded}
      toggleFolder={hook.toggleFolder}
    />
  );
}
