"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  User,
  Bell,
  Lock,
  Trash2,
  Loader2,
  Save,
  AlertTriangle,
} from "lucide-react";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
  requestNotificationPermission,
  getNotificationPermission,
} from "@/lib/services/notifications";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  // Profile state
  const [name, setName] = useState(user?.name || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    session_updates: true,
    observation_updates: true,
    invitation_updates: true,
    browser_notifications: false,
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">("default");

  // Delete account state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Load notification preferences
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await getNotificationPreferences();
      if (prefs) {
        setNotificationPrefs(prefs);
      }
      setBrowserPermission(getNotificationPermission());
    };
    loadPreferences();
  }, []);

  // Update name when user changes
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  // Handle profile update
  const handleSaveProfile = async () => {
    if (!user || !name.trim()) return;

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ name: name.trim() })
        .eq("id", user.id);

      if (error) throw error;

      setUser({ ...user, name: name.trim() });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all password fields.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New passwords do not match.",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to change password. Please try again.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle notification preferences update
  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      await updateNotificationPreferences(notificationPrefs);
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save notification preferences.",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // Handle browser notification permission request
  const handleRequestBrowserPermission = async () => {
    const permission = await requestNotificationPermission();
    setBrowserPermission(permission);
    if (permission === "granted") {
      setNotificationPrefs((prev) => ({ ...prev, browser_notifications: true }));
      toast({
        title: "Notifications enabled",
        description: "You will now receive browser notifications.",
      });
    } else if (permission === "denied") {
      toast({
        variant: "destructive",
        title: "Permission denied",
        description: "You denied notification permissions. Enable them in your browser settings.",
      });
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please type DELETE to confirm account deletion.",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Sign out and delete (Supabase auth cascade will handle user table)
      const { error } = await supabase.auth.admin.deleteUser(user!.id);
      if (error) throw error;

      await supabase.auth.signOut();
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete account. Please contact support.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Settings"
        description="Manage your account and preferences"
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed. Contact support if you need to update it.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile || name === user?.name}
                    className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Session Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when sessions start, end, or need attention
                        </p>
                      </div>
                      <Switch
                        checked={notificationPrefs.session_updates}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs((prev) => ({
                            ...prev,
                            session_updates: checked,
                          }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Observation Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when new observations are added
                        </p>
                      </div>
                      <Switch
                        checked={notificationPrefs.observation_updates}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs((prev) => ({
                            ...prev,
                            observation_updates: checked,
                          }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Invitation Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified about team invitations and role changes
                        </p>
                      </div>
                      <Switch
                        checked={notificationPrefs.invitation_updates}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs((prev) => ({
                            ...prev,
                            invitation_updates: checked,
                          }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Browser Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive push notifications in your browser
                        </p>
                        {browserPermission === "denied" && (
                          <p className="text-xs text-destructive">
                            Notifications are blocked. Enable them in browser settings.
                          </p>
                        )}
                        {browserPermission === "unsupported" && (
                          <p className="text-xs text-muted-foreground">
                            Browser notifications are not supported.
                          </p>
                        )}
                      </div>
                      {browserPermission === "granted" ? (
                        <Switch
                          checked={notificationPrefs.browser_notifications}
                          onCheckedChange={(checked) =>
                            setNotificationPrefs((prev) => ({
                              ...prev,
                              browser_notifications: checked,
                            }))
                          }
                        />
                      ) : browserPermission === "default" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRequestBrowserPermission}
                        >
                          Enable
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveNotifications}
                    disabled={isSavingNotifications}
                    className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                  >
                    {isSavingNotifications ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword || !newPassword || !confirmPassword}
                    className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                          <p>
                            This action cannot be undone. This will permanently delete
                            your account and remove all your data from our servers.
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="delete-confirm">
                              Type <strong>DELETE</strong> to confirm:
                            </Label>
                            <Input
                              id="delete-confirm"
                              value={deleteConfirmation}
                              onChange={(e) => setDeleteConfirmation(e.target.value)}
                              placeholder="DELETE"
                            />
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirmation !== "DELETE" || isDeleting}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete Account"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

