import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Plus, Power, PowerOff, Settings, Save, User, KeyRound, ShieldCheck, Globe } from "lucide-react";
import type { Tool } from "@shared/schema";

const addToolSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().min(1, "Icon/emoji is required"),
  category: z.string().min(1, "Category is required"),
  logoUrl: z.string().optional(),
  accessUrl: z.string().optional(),
  toolUsername: z.string().optional(),
  toolPassword: z.string().optional(),
  totpSecret: z.string().optional(),
});

type AddToolForm = z.infer<typeof addToolSchema>;

export default function AdminToolsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [credentialEdits, setCredentialEdits] = useState<Record<string, { toolUsername: string; toolPassword: string; totpSecret: string; accessUrl: string }>>({});

  const { data: tools, isLoading } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const form = useForm<AddToolForm>({
    resolver: zodResolver(addToolSchema),
    defaultValues: { name: "", description: "", icon: "", category: "AI", logoUrl: "", accessUrl: "", toolUsername: "", toolPassword: "", totpSecret: "" },
  });

  const addTool = useMutation({
    mutationFn: async (data: AddToolForm) => {
      await apiRequest("POST", "/api/admin/tools", {
        ...data,
        logoUrl: data.logoUrl || null,
        accessUrl: data.accessUrl || null,
        toolUsername: data.toolUsername || null,
        toolPassword: data.toolPassword || null,
        totpSecret: data.totpSecret || null,
        active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({ title: "Tool Added", description: "New tool has been created." });
      form.reset();
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleTool = useMutation({
    mutationFn: async ({ toolId, active }: { toolId: string; active: boolean }) => {
      await apiRequest("PATCH", `/api/admin/tools/${toolId}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({ title: "Updated", description: "Tool status updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateCredentials = useMutation({
    mutationFn: async ({ toolId, data }: { toolId: string; data: any }) => {
      await apiRequest("PATCH", `/api/admin/tools/${toolId}`, {
        toolUsername: data.toolUsername || null,
        toolPassword: data.toolPassword || null,
        totpSecret: data.totpSecret || null,
        accessUrl: data.accessUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({ title: "Saved", description: "Tool credentials updated." });
      setEditingTool(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const startEditing = (tool: Tool) => {
    setEditingTool(tool.id);
    setCredentialEdits((prev) => ({
      ...prev,
      [tool.id]: {
        toolUsername: tool.toolUsername || "",
        toolPassword: tool.toolPassword || "",
        totpSecret: tool.totpSecret || "",
        accessUrl: tool.accessUrl || "",
      },
    }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-admin-tools-title">
            Manage Tools
          </h1>
          <p className="text-muted-foreground mt-1">
            Add, enable, or disable software tools. Set shared account credentials and 2FA secrets.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-tool">
              <Plus className="mr-2 h-4 w-4" />
              Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Tool</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => addTool.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Tool name" data-testid="input-tool-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description" data-testid="input-tool-description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon (emoji or short text)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AI" data-testid="input-tool-icon" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AI, Design, Marketing" data-testid="input-tool-category" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://... or /logos/tool.png" data-testid="input-tool-logo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accessUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access URL (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://tool.example.com" data-testid="input-tool-access-url" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Shared Account Credentials (optional)
                  </p>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="toolUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username / Email</FormLabel>
                          <FormControl>
                            <Input placeholder="shared@account.com" data-testid="input-tool-username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="toolPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input placeholder="Account password" data-testid="input-tool-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="totpSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TOTP Secret (Base32)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. JBSWY3DPEHPK3PXP" data-testid="input-tool-totp" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={addTool.isPending}
                  data-testid="button-submit-tool"
                >
                  {addTool.isPending ? "Adding..." : "Add Tool"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tools?.map((tool) => (
            <Card key={tool.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    {tool.logoUrl ? (
                      <img
                        src={tool.logoUrl}
                        alt={tool.name}
                        className="h-9 w-9 rounded-md object-contain bg-white/5 p-0.5"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-sm font-semibold">
                        {tool.icon}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium" data-testid={`text-admin-tool-${tool.id}`}>
                          {tool.name}
                        </p>
                        {tool.toolUsername && (
                          <Badge variant="outline" className="text-[10px]">
                            <User className="h-2.5 w-2.5 mr-1" />
                            Credentials
                          </Badge>
                        )}
                        {tool.totpSecret && (
                          <Badge variant="outline" className="text-[10px]">
                            <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                            2FA
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{tool.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={tool.active ? "default" : "secondary"}>
                      {tool.active ? "Active" : "Disabled"}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => editingTool === tool.id ? setEditingTool(null) : startEditing(tool)}
                      data-testid={`button-edit-tool-${tool.id}`}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleTool.mutate({ toolId: tool.id, active: !tool.active })}
                      data-testid={`button-toggle-tool-${tool.id}`}
                    >
                      {tool.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {editingTool === tool.id && credentialEdits[tool.id] && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Shared Account Credentials
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Access URL
                        </Label>
                        <Input
                          value={credentialEdits[tool.id].accessUrl}
                          onChange={(e) => setCredentialEdits((prev) => ({
                            ...prev,
                            [tool.id]: { ...prev[tool.id], accessUrl: e.target.value },
                          }))}
                          placeholder="https://tool.example.com"
                          className="text-sm"
                          data-testid={`input-edit-access-url-${tool.id}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Username / Email
                        </Label>
                        <Input
                          value={credentialEdits[tool.id].toolUsername}
                          onChange={(e) => setCredentialEdits((prev) => ({
                            ...prev,
                            [tool.id]: { ...prev[tool.id], toolUsername: e.target.value },
                          }))}
                          placeholder="shared@account.com"
                          className="text-sm"
                          data-testid={`input-edit-username-${tool.id}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <KeyRound className="h-3 w-3" />
                          Password
                        </Label>
                        <Input
                          value={credentialEdits[tool.id].toolPassword}
                          onChange={(e) => setCredentialEdits((prev) => ({
                            ...prev,
                            [tool.id]: { ...prev[tool.id], toolPassword: e.target.value },
                          }))}
                          placeholder="Account password"
                          className="text-sm"
                          data-testid={`input-edit-password-${tool.id}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          TOTP Secret (Base32)
                        </Label>
                        <Input
                          value={credentialEdits[tool.id].totpSecret}
                          onChange={(e) => setCredentialEdits((prev) => ({
                            ...prev,
                            [tool.id]: { ...prev[tool.id], totpSecret: e.target.value },
                          }))}
                          placeholder="e.g. JBSWY3DPEHPK3PXP"
                          className="text-sm font-mono"
                          data-testid={`input-edit-totp-${tool.id}`}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateCredentials.mutate({ toolId: tool.id, data: credentialEdits[tool.id] })}
                        disabled={updateCredentials.isPending}
                        data-testid={`button-save-creds-${tool.id}`}
                      >
                        <Save className="mr-2 h-3 w-3" />
                        {updateCredentials.isPending ? "Saving..." : "Save Credentials"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingTool(null)}
                        data-testid={`button-cancel-edit-${tool.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && tools?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tools yet. Add your first tool above.</p>
        </div>
      )}
    </div>
  );
}
