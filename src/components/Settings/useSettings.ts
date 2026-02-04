import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext/AuthContext';
import { supabase } from '../../../supabase/client';
import { toast } from 'sonner';

type DeleteAccountResult = {
  success: boolean;
  error?: string;
  message?: string;
};

export function useSettings() {
  const { user, signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.rpc('delete_user_account');

      if (error) {
        throw error;
      }

      const result = data as unknown as DeleteAccountResult;

      if (result && !result.success) {
        throw new Error(result.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');

      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return {
    user,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    deleteConfirmation,
    setDeleteConfirmation,
    handleDeleteAccount,
  };
}
