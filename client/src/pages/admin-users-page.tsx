import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Search,
  UserX,
  UserCheck,
  Shield,
  ShieldOff,
  Trash2,
  Ban,
  Percent,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  Copy,
} from "lucide-react";
import type { User } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SafeUser = Omit<User, "passwordHash">;

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("admin");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRefCode, setNewRefCode] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingRefCode, setEditingRefCode] = useState<string | null>(null);
  const [refCodeValue, setRefCodeValue] = useState("");

  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateUser = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Updated", description: "User updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Deleted", description: "User has been permanently deleted." });
      setDeleteConfirm(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const regenerateKey = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/regenerate-key`);
      return res.json();
    },
    onSuccess: (data: { licenseKey: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Key Generated", description: `New key: ${data.licenseKey}` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createUser = useMutation({
    mutationFn: async (data: { email: string; password: string; role: string; referralCode?: string; generateLicenseKey?: boolean }) => {
      await apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Created", description: "New account created successfully." });
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
      setNewRefCode("");
      setShowCreateForm(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = users?.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.referralCode.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "suspended": return "destructive";
      case "cancelled": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-admin-users-title">
            Manage Users
          </h1>
          <p className="text-muted-foreground mt-1">
            View, manage, and control user accounts and affiliate settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-users"
            />
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            size="sm"
            data-testid="button-create-user"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <h3 className="font-medium mb-4">Create New Account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  data-testid="input-new-user-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-9"
                    data-testid="input-new-user-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "user")}>
                  <SelectTrigger data-testid="select-new-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-refcode">Custom Referral Code</Label>
                <Input
                  id="new-refcode"
                  placeholder="Optional (auto-generated if empty)"
                  value={newRefCode}
                  onChange={(e) => setNewRefCode(e.target.value)}
                  className="font-mono"
                  data-testid="input-new-user-refcode"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => createUser.mutate({ email: newEmail, password: newPassword, role: newRole, generateLicenseKey: true, ...(newRefCode.trim() ? { referralCode: newRefCode.trim() } : {}) })}
                  disabled={createUser.isPending || !newEmail || !newPassword}
                  className="w-full"
                  data-testid="button-submit-create-user"
                >
                  {createUser.isPending ? "Creating..." : "Create Account + License Key"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered?.map((u) => (
            <Card key={u.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary">
                      {u.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-user-email-${u.id}`}>
                        {u.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ref: {u.referralCode} · Commission: {u.commissionPercentage ?? 25}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {u.role}
                    </Badge>
                    <Badge variant={statusColor(u.subscriptionStatus) as any} className="text-xs">
                      {u.subscriptionStatus}
                    </Badge>
                    {u.affiliateEnabled === false && (
                      <Badge variant="outline" className="text-xs">affiliate off</Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                      data-testid={`button-expand-${u.id}`}
                    >
                      {expandedUser === u.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {expandedUser === u.id && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Subscription Status</Label>
                        <Select
                          value={u.subscriptionStatus}
                          onValueChange={(v) => updateUser.mutate({ userId: u.id, data: { subscriptionStatus: v } })}
                        >
                          <SelectTrigger className="h-8 text-xs" data-testid={`select-sub-${u.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Role</Label>
                        <Select
                          value={u.role}
                          onValueChange={(v) => updateUser.mutate({ userId: u.id, data: { role: v } })}
                        >
                          <SelectTrigger className="h-8 text-xs" data-testid={`select-role-${u.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Commission %</Label>
                        <Select
                          value={String(u.commissionPercentage ?? 25)}
                          onValueChange={(v) => updateUser.mutate({ userId: u.id, data: { commissionPercentage: parseInt(v) } })}
                        >
                          <SelectTrigger className="h-8 text-xs" data-testid={`select-commission-${u.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25">25% (default)</SelectItem>
                            <SelectItem value="30">30%</SelectItem>
                            <SelectItem value="35">35%</SelectItem>
                            <SelectItem value="40">40%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Affiliate Status</Label>
                        <Button
                          size="sm"
                          variant={u.affiliateEnabled !== false ? "outline" : "default"}
                          className="w-full h-8 text-xs"
                          onClick={() => updateUser.mutate({ userId: u.id, data: { affiliateEnabled: u.affiliateEnabled === false } })}
                          data-testid={`button-toggle-affiliate-${u.id}`}
                        >
                          <Percent className="h-3 w-3 mr-1" />
                          {u.affiliateEnabled !== false ? "Disable Affiliate" : "Enable Affiliate"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Affiliate / Referral Code</Label>
                      <div className="flex items-center gap-2">
                        {editingRefCode === u.id ? (
                          <>
                            <Input
                              value={refCodeValue}
                              onChange={(e) => setRefCodeValue(e.target.value)}
                              className="h-8 text-xs font-mono flex-1"
                              placeholder="custom-code"
                              data-testid={`input-refcode-${u.id}`}
                            />
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              disabled={!refCodeValue.trim() || updateUser.isPending}
                              onClick={() => {
                                updateUser.mutate(
                                  { userId: u.id, data: { referralCode: refCodeValue.trim() } },
                                  { onSuccess: () => setEditingRefCode(null) }
                                );
                              }}
                              data-testid={`button-save-refcode-${u.id}`}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => setEditingRefCode(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono" data-testid={`text-refcode-${u.id}`}>
                              {u.referralCode}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => { setEditingRefCode(u.id); setRefCodeValue(u.referralCode); }}
                              data-testid={`button-edit-refcode-${u.id}`}
                            >
                              Edit
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Key className="h-3 w-3" />
                        License Key
                      </Label>
                      <div className="flex items-center gap-2">
                        {u.licenseKey ? (
                          <>
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono tracking-wider" data-testid={`text-license-key-${u.id}`}>
                              {u.licenseKey}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={async () => {
                                await navigator.clipboard.writeText(u.licenseKey!);
                                toast({ title: "Copied", description: "License key copied." });
                              }}
                              data-testid={`button-copy-key-${u.id}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No key assigned</span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => regenerateKey.mutate(u.id)}
                          disabled={regenerateKey.isPending}
                          data-testid={`button-regen-key-${u.id}`}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {u.licenseKey ? "Regenerate" : "Generate"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pt-1">
                      <span>Discord: {u.discordUsername || "Not linked"}</span>
                      <span>·</span>
                      <span>Balance: ${((u.earningsBalance || 0) / 100).toFixed(2)}</span>
                      <span>·</span>
                      <span>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {u.subscriptionStatus !== "suspended" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => updateUser.mutate({ userId: u.id, data: { subscriptionStatus: "suspended" } })}
                          data-testid={`button-suspend-${u.id}`}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => updateUser.mutate({ userId: u.id, data: { subscriptionStatus: "inactive" } })}
                          data-testid={`button-reactivate-${u.id}`}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Reactivate
                        </Button>
                      )}
                      {u.twoFactorEnabled && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => updateUser.mutate({ userId: u.id, data: { reset2fa: true } })}
                          disabled={updateUser.isPending}
                          data-testid={`button-reset-2fa-${u.id}`}
                        >
                          <ShieldOff className="h-3 w-3 mr-1" />
                          Reset 2FA
                        </Button>
                      )}
                      {deleteConfirm === u.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-destructive font-medium">Are you sure?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => deleteUser.mutate(u.id)}
                            disabled={deleteUser.isPending}
                            data-testid={`button-confirm-delete-${u.id}`}
                          >
                            {deleteUser.isPending ? "Deleting..." : "Yes, Delete"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(u.id)}
                          data-testid={`button-delete-${u.id}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No users found.</p>
        </div>
      )}
    </div>
  );
}
