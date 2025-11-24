import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import http from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Shield, Ban, UserCheck } from "lucide-react";

type AdminUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  telegramUsername?: string;
  phone?: string;
  email?: string;
  role: string;
  isBlocked?: boolean;
  createdAt?: string;
};

type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
};

type Filters = {
  q: string;
  role: string;
  blocked: string;
};

const defaultFilters: Filters = {
  q: "",
  role: "",
  blocked: "",
};

export default function AdminUsersTab() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const { toast } = useToast();

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (appliedFilters.q) params.set("search", appliedFilters.q);
    if (appliedFilters.role) params.set("role", appliedFilters.role);
    if (appliedFilters.blocked === "blocked") params.set("blocked", "true");
    if (appliedFilters.blocked === "unblocked") params.set("blocked", "false");
    return params.toString();
  }, [appliedFilters]);

  const { data, isLoading, error } = useQuery<AdminUsersResponse>({
    queryKey: ["/api/admin/users", queryString],
    queryFn: async () => {
      const url = `/api/admin/users${queryString ? `?${queryString}` : ''}`;
      const response = await http.get<AdminUsersResponse>(url);
      return response.data;
    },
    enabled: true,
  });

  const users = data?.users || [];

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await http.put(`/api/admin/users/${userId}/role`, { role });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const updateBlockStatusMutation = useMutation({
    mutationFn: async ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) => {
      const response = await http.put(`/api/admin/users/${userId}/block`, { isBlocked });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User block status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to update user block status",
        variant: "destructive",
      });
    },
  });

  const onChangeFilters = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <Label htmlFor="search-filter">Search</Label>
              <Input
                id="search-filter"
                placeholder="Name, phone or email"
                value={filters.q}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeFilters("q", e.target.value)}
                data-testid="input-search-filter"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="role-filter">Role</Label>
              <Select
                value={filters.role}
                onValueChange={(value) => onChangeFilters("role", value)}
              >
                <SelectTrigger id="role-filter" className="w-[180px]" data-testid="select-role-filter">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="blocked-filter">Status</Label>
              <Select
                value={filters.blocked}
                onValueChange={(value) => onChangeFilters("blocked", value)}
              >
                <SelectTrigger id="blocked-filter" className="w-[180px]" data-testid="select-blocked-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="unblocked">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={applyFilters}
              disabled={isLoading}
              data-testid="button-apply-filters"
            >
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6 text-destructive">
            Error: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user._id} data-testid={`row-user-${user._id}`}>
                        <TableCell className="font-medium" data-testid={`text-name-${user._id}`}>
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                            user.username ||
                            "—"}
                        </TableCell>
                        <TableCell data-testid={`text-phone-${user._id}`}>
                          {user.phone || "—"}
                        </TableCell>
                        <TableCell data-testid={`text-email-${user._id}`}>
                          {user.email || "—"}
                        </TableCell>
                        <TableCell data-testid={`text-username-${user._id}`}>
                          {user.telegramUsername || user.username || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === "admin" ? "default" : "secondary"}
                            data-testid={`badge-role-${user._id}`}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isBlocked ? "destructive" : "default"}
                            data-testid={`badge-blocked-${user._id}`}
                          >
                            {user.isBlocked ? "Blocked" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateRoleMutation.mutate({
                                  userId: user._id,
                                  role: user.role === "admin" ? "user" : "admin",
                                })
                              }
                              disabled={updateRoleMutation.isPending}
                              data-testid={`button-toggle-admin-${user._id}`}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                            </Button>
                            <Button
                              size="sm"
                              variant={user.isBlocked ? "default" : "destructive"}
                              onClick={() =>
                                updateBlockStatusMutation.mutate({
                                  userId: user._id,
                                  isBlocked: !user.isBlocked,
                                })
                              }
                              disabled={updateBlockStatusMutation.isPending}
                              data-testid={`button-toggle-block-${user._id}`}
                            >
                              {user.isBlocked ? (
                                <>
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Unblock
                                </>
                              ) : (
                                <>
                                  <Ban className="h-4 w-4 mr-1" />
                                  Block
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
