import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_CONFIG } from '@/config/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Mail, AlertTriangle, HelpCircle } from 'lucide-react';
import { FAQDialog } from '../FAQ/FAQDialog';
import { Link } from 'react-router-dom';

interface SettingsUIProps {
  user: User;
  isDeleting: boolean;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  deleteConfirmation: string;
  setDeleteConfirmation: (value: string) => void;
  handleDeleteAccount: () => Promise<void>;
  showFAQDialog: boolean;
  setShowFAQDialog: (show: boolean) => void;
}

export default function SettingsUI({
  user,
  isDeleting,
  showDeleteDialog,
  setShowDeleteDialog,
  deleteConfirmation,
  setDeleteConfirmation,
  handleDeleteAccount,
  showFAQDialog,
  setShowFAQDialog,
}: SettingsUIProps) {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={user.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                Your email address is managed through your authentication provider
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Help & Support</CardTitle>
            <CardDescription>Get help and find answers to common questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button
                variant="outline"
                onClick={() => setShowFAQDialog(true)}
                className="w-full sm:w-auto"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                View FAQ
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Find answers to frequently asked questions
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                For additional support or account-related questions, contact us at:
              </p>
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
                <a
                  href={`mailto:${APP_CONFIG.supportEmail}`}
                  className="text-primary hover:underline font-medium"
                >
{APP_CONFIG.supportEmail}
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Replace with your actual support email address
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legal</CardTitle>
            <CardDescription>Terms and policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              <Link
                to="/terms"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                Terms of Service
              </Link>
              <Link
                to="/privacy"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                Privacy Policy
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Review our terms and privacy practices
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              To Delete Your Account
            </CardTitle>
            <CardDescription>
              This action will permanently delete your account and all data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                This action cannot be undone
              </p>
              <p className="text-sm text-muted-foreground">
                Deleting your account will permanently remove:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                <li>All vocabulary words and definitions</li>
                <li>Test history and statistics</li>
                <li>Progress tracking and confidence scores</li>
                <li>All bookmarks and folders</li>
                <li>Your profile and account information</li>
              </ul>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This action cannot be undone. This will permanently delete your account and remove
                all your data from our servers.
              </p>
              <p className="text-sm">
                Your data will be handled according to our{' '}
                <Link
                  to="/privacy"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  Type <span className="font-bold text-foreground">DELETE</span> to confirm
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  disabled={isDeleting}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => {
                setDeleteConfirmation('');
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              disabled={isDeleting || deleteConfirmation !== 'DELETE'}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FAQDialog open={showFAQDialog} onOpenChange={setShowFAQDialog} />
    </div>
  );
}
