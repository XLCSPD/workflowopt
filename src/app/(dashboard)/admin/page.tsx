"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Upload,
  Video,
  FileText,
  BookOpen,
  HelpCircle,
  Users,
  AlertTriangle,
  Settings,
} from "lucide-react";

// Mock data
const mockWasteTypes = [
  {
    id: "1",
    code: "D",
    name: "Defects",
    category: "core_lean",
    description: "Errors, rework, mistakes that require correction",
    examples: ["Data entry errors", "System bugs", "Incorrect file formats"],
  },
  {
    id: "2",
    code: "W",
    name: "Waiting",
    category: "core_lean",
    description: "Idle time waiting for the next step",
    examples: ["System load times", "Waiting for approvals", "Queue delays"],
  },
  {
    id: "3",
    code: "IW",
    name: "Integration Waste",
    category: "digital",
    description: "Friction from disconnected systems",
    examples: ["Manual data transfer", "Re-keying information", "Export/import"],
  },
];

const mockTrainingContent = [
  {
    id: "1",
    title: "Introduction to Lean Waste",
    type: "video",
    duration: 15,
    updatedAt: "2024-01-15",
  },
  {
    id: "2",
    title: "DOWNTIME Wastes Explained",
    type: "slides",
    duration: 20,
    updatedAt: "2024-01-10",
  },
  {
    id: "3",
    title: "Digital Waste in Modern Workflows",
    type: "article",
    duration: 10,
    updatedAt: "2024-01-05",
  },
  {
    id: "4",
    title: "Waste Identification Quiz",
    type: "quiz",
    duration: 15,
    updatedAt: "2024-01-01",
  },
];

const mockUsers = [
  {
    id: "1",
    name: "Ayo Sasore",
    email: "ayo@versatex.com",
    role: "admin",
    status: "active",
  },
  {
    id: "2",
    name: "Jane Doe",
    email: "jane@premierhealth.com",
    role: "facilitator",
    status: "active",
  },
  {
    id: "3",
    name: "John Smith",
    email: "john@versatex.com",
    role: "participant",
    status: "active",
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case "video":
      return Video;
    case "slides":
      return FileText;
    case "article":
      return BookOpen;
    case "quiz":
      return HelpCircle;
    default:
      return FileText;
  }
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("waste-types");
  const [isWasteDialogOpen, setIsWasteDialogOpen] = useState(false);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Admin Settings"
        description="Manage waste definitions, training content, and users"
      />

      <div className="flex-1 p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="waste-types">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Waste Types
            </TabsTrigger>
            <TabsTrigger value="training">
              <BookOpen className="h-4 w-4 mr-2" />
              Training Content
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Waste Types Tab */}
          <TabsContent value="waste-types">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Waste Type Definitions</CardTitle>
                    <CardDescription>
                      Manage the waste types available for tagging
                    </CardDescription>
                  </div>
                  <Dialog
                    open={isWasteDialogOpen}
                    onOpenChange={setIsWasteDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Waste Type
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Waste Type</DialogTitle>
                        <DialogDescription>
                          Create a new waste type definition
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Code</Label>
                            <Input placeholder="e.g., D, IW" />
                          </div>
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="core_lean">
                                  Core Lean (DOWNTIME)
                                </SelectItem>
                                <SelectItem value="digital">Digital</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input placeholder="e.g., Defects" />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea placeholder="Describe this waste type..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Digital Examples (one per line)</Label>
                          <Textarea
                            placeholder="Data entry errors&#10;System bugs&#10;Incorrect file formats"
                            rows={4}
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
                        <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                          Create Waste Type
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Examples</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockWasteTypes.map((waste) => (
                      <TableRow key={waste.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {waste.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {waste.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              waste.category === "digital"
                                ? "bg-purple-100 text-purple-700"
                                : ""
                            }
                          >
                            {waste.category === "core_lean"
                              ? "Core Lean"
                              : "Digital"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {waste.description}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {waste.examples.length} examples
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Training Content</CardTitle>
                    <CardDescription>
                      Manage videos, slides, articles, and quizzes
                    </CardDescription>
                  </div>
                  <Dialog
                    open={isContentDialogOpen}
                    onOpenChange={setIsContentDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Content
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Training Content</DialogTitle>
                        <DialogDescription>
                          Add a new training module
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input placeholder="Module title" />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
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
                          <Label>Description</Label>
                          <Textarea placeholder="Describe this module..." />
                        </div>
                        <div className="space-y-2">
                          <Label>File</Label>
                          <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload or drag and drop
                            </p>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsContentDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                          Upload Content
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTrainingContent.map((content) => {
                      const Icon = getTypeIcon(content.type);
                      return (
                        <TableRow key={content.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {content.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {content.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{content.duration} min</TableCell>
                          <TableCell>
                            {new Date(content.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Manage user access and roles
                    </CardDescription>
                  </div>
                  <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                    <Plus className="mr-2 h-4 w-4" />
                    Invite User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin"
                                ? "default"
                                : user.role === "facilitator"
                                ? "secondary"
                                : "outline"
                            }
                            className={
                              user.role === "admin"
                                ? "bg-brand-navy"
                                : user.role === "facilitator"
                                ? "bg-brand-gold text-brand-navy"
                                : ""
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-brand-emerald text-brand-emerald"
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
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

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Settings</CardTitle>
                  <CardDescription>
                    Configure your organization details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Organization Name</Label>
                    <Input defaultValue="Versatex Solutions" />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-brand-gold flex items-center justify-center">
                        <span className="text-2xl font-bold text-brand-navy">
                          V
                        </span>
                      </div>
                      <Button variant="outline">Change Logo</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Auto-Save Settings</CardTitle>
                  <CardDescription>
                    Configure automatic saving behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-save observations</p>
                      <p className="text-sm text-muted-foreground">
                        Save observations automatically as users tag waste
                      </p>
                    </div>
                    <Badge className="bg-brand-emerald">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Session auto-save interval</p>
                      <p className="text-sm text-muted-foreground">
                        How often to save session state
                      </p>
                    </div>
                    <Select defaultValue="10">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

