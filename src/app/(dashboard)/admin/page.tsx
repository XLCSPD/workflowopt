"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
  BookOpen,
  Users,
  Loader2,
  Video,
  FileText,
  Mail,
  Shield,
  UserCog,
  UserMinus,
  Building,
  Save,
  Clock,
  XCircle,
  BarChart3,
  Workflow,
  ClipboardList,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getWasteTypes,
  createWasteType,
  updateWasteType,
  deleteWasteType,
} from "@/lib/services/wasteTypes";
import {
  getTrainingContent,
  createTrainingContent,
  updateTrainingContent,
  deleteTrainingContent,
} from "@/lib/services/training";
import {
  getOrganizationUsers,
  inviteUser,
  updateUserRole,
  removeUserFromOrganization,
  getRoleBadgeVariant,
  getRoleDisplayName,
  getPendingInvitations,
  cancelInvitation,
  type Invitation,
} from "@/lib/services/users";
import {
  getCurrentOrganization,
  createOrganization,
  updateOrganization,
  getOrganizationStats,
  type OrganizationStats,
} from "@/lib/services/organizations";
import { useAuthStore } from "@/lib/stores/authStore";
import type { WasteType, TrainingContent, User, UserRole, Organization } from "@/types";

export default function AdminPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState("organization");
  const [isLoading, setIsLoading] = useState(true);

  // Waste Types State
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [isWasteDialogOpen, setIsWasteDialogOpen] = useState(false);
  const [editingWasteType, setEditingWasteType] = useState<WasteType | null>(null);
  const [wasteForm, setWasteForm] = useState({
    code: "",
    name: "",
    description: "",
    category: "core_lean" as "core_lean" | "digital",
  });

  // Training Content State
  const [trainingContent, setTrainingContent] = useState<TrainingContent[]>([]);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingContent | null>(null);
  const [trainingForm, setTrainingForm] = useState({
    title: "",
    description: "",
    type: "video" as "video" | "slides" | "article" | "quiz",
    duration_minutes: 10,
    order_index: 0,
  });

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "participant" as UserRole,
  });
  const [isInviting, setIsInviting] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);

  // Organization State
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgStats, setOrgStats] = useState<OrganizationStats | null>(null);
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isCreateOrgDialogOpen, setIsCreateOrgDialogOpen] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: "" });
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [wasteTypesData, trainingData, usersData, orgData, invitationsData] = await Promise.all([
          getWasteTypes(),
          getTrainingContent(),
          getOrganizationUsers(),
          getCurrentOrganization(),
          getPendingInvitations(),
        ]);
        setWasteTypes(wasteTypesData);
        setTrainingContent(trainingData);
        setUsers(usersData);
        setOrganization(orgData);
        setPendingInvitations(invitationsData);

        // Load org stats if we have an org
        if (orgData) {
          const stats = await getOrganizationStats(orgData.id);
          setOrgStats(stats);
          setOrgForm({ name: orgData.name });
        }
      } catch (error) {
        console.error("Failed to load admin data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load data.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [toast]);

  // Waste Type CRUD
  const handleSaveWasteType = async () => {
    try {
      if (editingWasteType) {
        const updated = await updateWasteType(editingWasteType.id, wasteForm);
        setWasteTypes(wasteTypes.map((wt) => (wt.id === updated.id ? updated : wt)));
        toast({ title: "Waste type updated" });
      } else {
        const created = await createWasteType(wasteForm);
        setWasteTypes([...wasteTypes, created]);
        toast({ title: "Waste type created" });
      }
      setIsWasteDialogOpen(false);
      resetWasteForm();
    } catch (error) {
      console.error("Failed to save waste type:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save waste type.",
      });
    }
  };

  const handleEditWasteType = (wt: WasteType) => {
    setEditingWasteType(wt);
    setWasteForm({
      code: wt.code,
      name: wt.name,
      description: wt.description,
      category: wt.category,
    });
    setIsWasteDialogOpen(true);
  };

  const handleDeleteWasteType = async (id: string) => {
    try {
      await deleteWasteType(id);
      setWasteTypes(wasteTypes.filter((wt) => wt.id !== id));
      toast({ title: "Waste type deleted" });
    } catch (error) {
      console.error("Failed to delete waste type:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete waste type.",
      });
    }
  };

  const resetWasteForm = () => {
    setEditingWasteType(null);
    setWasteForm({ code: "", name: "", description: "", category: "core_lean" });
  };

  // Training Content CRUD
  const handleSaveTraining = async () => {
    try {
      if (editingTraining) {
        const updated = await updateTrainingContent(editingTraining.id, trainingForm);
        setTrainingContent(trainingContent.map((tc) => (tc.id === updated.id ? updated : tc)));
        toast({ title: "Training content updated" });
      } else {
        const created = await createTrainingContent({
          ...trainingForm,
          content: JSON.stringify({}),
        });
        setTrainingContent([...trainingContent, created]);
        toast({ title: "Training content created" });
      }
      setIsTrainingDialogOpen(false);
      resetTrainingForm();
    } catch (error) {
      console.error("Failed to save training content:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save training content.",
      });
    }
  };

  const handleEditTraining = (tc: TrainingContent) => {
    setEditingTraining(tc);
    setTrainingForm({
      title: tc.title,
      description: tc.description || "",
      type: tc.type,
      duration_minutes: tc.duration_minutes || 10,
      order_index: tc.order_index,
    });
    setIsTrainingDialogOpen(true);
  };

  const handleDeleteTraining = async (id: string) => {
    try {
      await deleteTrainingContent(id);
      setTrainingContent(trainingContent.filter((tc) => tc.id !== id));
      toast({ title: "Training content deleted" });
    } catch (error) {
      console.error("Failed to delete training content:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete training content.",
      });
    }
  };

  const resetTrainingForm = () => {
    setEditingTraining(null);
    setTrainingForm({
      title: "",
      description: "",
      type: "video",
      duration_minutes: 10,
      order_index: trainingContent.length,
    });
  };

  // User Management
  const handleInviteUser = async () => {
    if (!inviteForm.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an email address.",
      });
      return;
    }

    setIsInviting(true);
    try {
      const result = await inviteUser(inviteForm.email, inviteForm.role);
      
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setIsUserDialogOpen(false);
        resetInviteForm();
        // Reload users
        const usersData = await getOrganizationUsers();
        setUsers(usersData);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    } catch (error) {
      console.error("Failed to invite user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to invite user.",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const updated = await updateUserRole(userId, newRole);
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      toast({ title: "Role updated", description: `User role changed to ${getRoleDisplayName(newRole)}` });
      setIsRoleDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to update role:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user role.",
      });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You cannot remove yourself from the organization.",
      });
      return;
    }

    try {
      await removeUserFromOrganization(userId);
      setUsers(users.filter((u) => u.id !== userId));
      toast({ title: "User removed", description: "User has been removed from the organization." });
    } catch (error) {
      console.error("Failed to remove user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove user.",
      });
    }
  };

  const resetInviteForm = () => {
    setInviteForm({ email: "", role: "participant" });
  };

  // Organization Management
  const handleSaveOrganization = async () => {
    if (!orgForm.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Organization name is required.",
      });
      return;
    }

    setIsSavingOrg(true);
    try {
      if (organization) {
        const updated = await updateOrganization(organization.id, { name: orgForm.name });
        setOrganization(updated);
        toast({ title: "Success", description: "Organization updated." });
      } else {
        const created = await createOrganization({ name: orgForm.name });
        setOrganization(created);
        const stats = await getOrganizationStats(created.id);
        setOrgStats(stats);
        setIsCreateOrgDialogOpen(false);
        toast({ title: "Success", description: "Organization created." });
      }
      setIsOrgDialogOpen(false);
    } catch (error) {
      console.error("Failed to save organization:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save organization.",
      });
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const success = await cancelInvitation(invitationId);
      if (success) {
        setPendingInvitations(pendingInvitations.filter((i) => i.id !== invitationId));
        toast({ title: "Invitation cancelled" });
      } else {
        throw new Error("Failed to cancel invitation");
      }
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel invitation.",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "slides":
      case "article":
        return <FileText className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Admin Settings"
        description="Manage waste types, training content, and users"
      />

      <div className="flex-1 p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="waste-types" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Waste Types
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Training Content
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Organization Tab */}
          <TabsContent value="organization">
            {!organization ? (
              <Card>
                <CardHeader>
                  <CardTitle>Create Your Organization</CardTitle>
                  <CardDescription>
                    Set up your organization to start collaborating with your team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Building className="h-16 w-16 text-muted-foreground" />
                    <p className="text-muted-foreground text-center max-w-md">
                      You haven&apos;t created an organization yet. Create one to invite team members and start tracking waste in your processes.
                    </p>
                    <Dialog open={isCreateOrgDialogOpen} onOpenChange={setIsCreateOrgDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Organization
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Organization</DialogTitle>
                          <DialogDescription>
                            Enter a name for your organization
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Organization Name</Label>
                            <Input
                              placeholder="e.g., Acme Corp"
                              value={orgForm.name}
                              onChange={(e) => setOrgForm({ name: e.target.value })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateOrgDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveOrganization}
                            disabled={isSavingOrg}
                            className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                          >
                            {isSavingOrg ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Organization Info Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{organization.name}</CardTitle>
                      <CardDescription>
                        Created on {new Date(organization.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Organization</DialogTitle>
                          <DialogDescription>
                            Update your organization details
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Organization Name</Label>
                            <Input
                              value={orgForm.name}
                              onChange={(e) => setOrgForm({ name: e.target.value })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsOrgDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveOrganization}
                            disabled={isSavingOrg}
                            className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                          >
                            {isSavingOrg ? (
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
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {orgStats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                          <div className="p-2 rounded-md bg-blue-500/10">
                            <Users className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{orgStats.userCount}</p>
                            <p className="text-sm text-muted-foreground">Team Members</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                          <div className="p-2 rounded-md bg-purple-500/10">
                            <Workflow className="h-5 w-5 text-purple-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{orgStats.workflowCount}</p>
                            <p className="text-sm text-muted-foreground">Workflows</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                          <div className="p-2 rounded-md bg-green-500/10">
                            <ClipboardList className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{orgStats.sessionCount}</p>
                            <p className="text-sm text-muted-foreground">Sessions</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                          <div className="p-2 rounded-md bg-orange-500/10">
                            <Eye className="h-5 w-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{orgStats.observationCount}</p>
                            <p className="text-sm text-muted-foreground">Observations</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pending Invitations Card */}
                {pendingInvitations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-500" />
                        Pending Invitations
                      </CardTitle>
                      <CardDescription>
                        {pendingInvitations.length} invitation{pendingInvitations.length !== 1 ? "s" : ""} waiting to be accepted
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead className="w-[70px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingInvitations.map((invitation) => (
                            <TableRow key={invitation.id}>
                              <TableCell className="font-medium">{invitation.email}</TableCell>
                              <TableCell>
                                <Badge variant={getRoleBadgeVariant(invitation.role)}>
                                  {getRoleDisplayName(invitation.role)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    invitation.status === "pending"
                                      ? "secondary"
                                      : invitation.status === "failed"
                                      ? "destructive"
                                      : "outline"
                                  }
                                >
                                  {invitation.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(invitation.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  title="Cancel invitation"
                                >
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Waste Types Tab */}
          <TabsContent value="waste-types">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Waste Type Definitions</CardTitle>
                  <CardDescription>
                    Manage the waste types used for tagging
                  </CardDescription>
                </div>
                <Dialog
                  open={isWasteDialogOpen}
                  onOpenChange={(open) => {
                    setIsWasteDialogOpen(open);
                    if (!open) resetWasteForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Waste Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingWasteType ? "Edit Waste Type" : "Add Waste Type"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingWasteType
                          ? "Update waste type definition"
                          : "Create a new waste type for tagging"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Code</Label>
                          <Input
                            placeholder="e.g., D, O, W"
                            value={wasteForm.code}
                            onChange={(e) =>
                              setWasteForm({ ...wasteForm, code: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={wasteForm.category}
                            onValueChange={(value: "core_lean" | "digital") =>
                              setWasteForm({ ...wasteForm, category: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="core_lean">Core Lean</SelectItem>
                              <SelectItem value="digital">Digital</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          placeholder="e.g., Defects"
                          value={wasteForm.name}
                          onChange={(e) =>
                            setWasteForm({ ...wasteForm, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Describe this waste type..."
                          value={wasteForm.description}
                          onChange={(e) =>
                            setWasteForm({ ...wasteForm, description: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsWasteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveWasteType}
                        className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                      >
                        {editingWasteType ? "Update" : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wasteTypes.map((wt) => (
                      <TableRow key={wt.id}>
                        <TableCell>
                          <Badge variant="outline">{wt.code}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{wt.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              wt.category === "core_lean" ? "secondary" : "default"
                            }
                          >
                            {wt.category === "core_lean" ? "Core Lean" : "Digital"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {wt.description}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditWasteType(wt)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteWasteType(wt.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Content Tab */}
          <TabsContent value="training">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Training Content</CardTitle>
                  <CardDescription>
                    Manage training modules and content
                  </CardDescription>
                </div>
                <Dialog
                  open={isTrainingDialogOpen}
                  onOpenChange={(open) => {
                    setIsTrainingDialogOpen(open);
                    if (!open) resetTrainingForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingTraining ? "Edit Training Content" : "Add Training Content"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingTraining
                          ? "Update training module"
                          : "Create a new training module"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          placeholder="Module title"
                          value={trainingForm.title}
                          onChange={(e) =>
                            setTrainingForm({ ...trainingForm, title: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Module description..."
                          value={trainingForm.description}
                          onChange={(e) =>
                            setTrainingForm({
                              ...trainingForm,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={trainingForm.type}
                            onValueChange={(
                              value: "video" | "slides" | "article" | "quiz"
                            ) => setTrainingForm({ ...trainingForm, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="slides">Slides</SelectItem>
                              <SelectItem value="article">Article</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (minutes)</Label>
                          <Input
                            type="number"
                            value={trainingForm.duration_minutes}
                            onChange={(e) =>
                              setTrainingForm({
                                ...trainingForm,
                                duration_minutes: parseInt(e.target.value) || 10,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Order Index</Label>
                        <Input
                          type="number"
                          value={trainingForm.order_index}
                          onChange={(e) =>
                            setTrainingForm({
                              ...trainingForm,
                              order_index: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsTrainingDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveTraining}
                        className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                      >
                        {editingTraining ? "Update" : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingContent.map((tc) => (
                      <TableRow key={tc.id}>
                        <TableCell>{tc.order_index}</TableCell>
                        <TableCell className="font-medium">{tc.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(tc.type)}
                            <span className="capitalize">{tc.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{tc.duration_minutes} min</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditTraining(tc)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteTraining(tc.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Invite users and manage roles ({users.length} users)
                  </CardDescription>
                </div>
                <Dialog
                  open={isUserDialogOpen}
                  onOpenChange={(open) => {
                    setIsUserDialogOpen(open);
                    if (!open) resetInviteForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                      <Plus className="mr-2 h-4 w-4" />
                      Invite User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite User</DialogTitle>
                      <DialogDescription>
                        Send an invitation to join your organization
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="user@company.com"
                            className="pl-10"
                            value={inviteForm.email}
                            onChange={(e) =>
                              setInviteForm({ ...inviteForm, email: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={inviteForm.role}
                          onValueChange={(value: UserRole) =>
                            setInviteForm({ ...inviteForm, role: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="participant">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Participant
                              </div>
                            </SelectItem>
                            <SelectItem value="facilitator">
                              <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4" />
                                Facilitator
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {inviteForm.role === "admin" && "Full access to all features and settings"}
                          {inviteForm.role === "facilitator" && "Can create and manage sessions and workflows"}
                          {inviteForm.role === "participant" && "Can participate in sessions and view training"}
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsUserDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleInviteUser}
                        disabled={isInviting}
                        className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                      >
                        {isInviting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Inviting...
                          </>
                        ) : (
                          "Send Invitation"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No users found.</p>
                    <p className="text-sm">
                      Invite users to get started.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="bg-brand-gold/20 text-brand-navy text-xs">
                                  {getUserInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                {user.id === currentUser?.id && (
                                  <span className="text-xs text-muted-foreground">(You)</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingUser(user);
                                    setIsRoleDialogOpen(true);
                                  }}
                                >
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleRemoveUser(user.id)}
                                  disabled={user.id === currentUser?.id}
                                >
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  Remove from Org
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {editingUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select
                defaultValue={editingUser?.role}
                onValueChange={(value: UserRole) => {
                  if (editingUser) {
                    handleUpdateRole(editingUser.id, value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Participant
                    </div>
                  </SelectItem>
                  <SelectItem value="facilitator">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      Facilitator
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRoleDialogOpen(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
