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
import { CheckCircle, XCircle, Clock } from "lucide-react";

type AdminAdOwner = {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  telegramId?: string;
};

type AdminAd = {
  _id: string;
  title: string;
  price?: number;
  status: string;
  createdAt: string;
  owner?: AdminAdOwner;
  userTelegramId?: string;
};

type AdminAdsResponse = {
  ads: AdminAd[];
  total: number;
  page: number;
  totalPages: number;
};

type Filters = {
  status: string;
  q: string;
  ownerPhone: string;
};

const defaultFilters: Filters = {
  status: "",
  q: "",
  ownerPhone: "",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  blocked: "Blocked",
};

const statusVariants: { [key: string]: "default" | "secondary" | "destructive" } = {
  active: "default",
  pending: "secondary",
  blocked: "destructive",
};

function getOwnerDisplay(owner?: AdminAdOwner) {
  if (!owner) return "-";

  const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(" ");
  if (fullName) return `${fullName}${owner.phone ? ` (${owner.phone})` : ""}`;
  if (owner.username) return owner.username;
  if (owner.telegramId) return `TG: ${owner.telegramId}`;
  return owner.phone || "-";
}

export default function AdminAdsTab() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const { toast } = useToast();

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (appliedFilters.status) params.set("status", appliedFilters.status);
    if (appliedFilters.q) params.set("search", appliedFilters.q);
    if (appliedFilters.ownerPhone) params.set("ownerPhone", appliedFilters.ownerPhone);
    return params.toString();
  }, [appliedFilters]);

  const { data, isLoading, error } = useQuery<AdminAdsResponse>({
    queryKey: ["/api/admin/ads", queryString],
    queryFn: async () => {
      const url = `/api/admin/ads${queryString ? `?${queryString}` : ''}`;
      const response = await http.get<AdminAdsResponse>(url);
      return response.data;
    },
    enabled: true,
  });

  const ads = data?.ads || [];

  const updateStatusMutation = useMutation({
    mutationFn: async ({ adId, status }: { adId: string; status: string }) => {
      const response = await http.put(`/api/admin/ads/${adId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ads"] });
      toast({
        title: "Success",
        description: "Ad status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to update ad status",
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => onChangeFilters("status", value)}
              >
                <SelectTrigger id="status-filter" className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <Label htmlFor="search-filter">Search</Label>
              <Input
                id="search-filter"
                placeholder="Title or description"
                value={filters.q}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeFilters("q", e.target.value)}
                data-testid="input-search-filter"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone-filter">Owner Phone</Label>
              <Input
                id="phone-filter"
                placeholder="+375..."
                value={filters.ownerPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeFilters("ownerPhone", e.target.value)}
                data-testid="input-phone-filter"
              />
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
                    <TableHead>Title</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No ads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    ads.map((ad) => (
                      <TableRow key={ad._id} data-testid={`row-ad-${ad._id}`}>
                        <TableCell className="font-medium" data-testid={`text-title-${ad._id}`}>
                          {ad.title}
                        </TableCell>
                        <TableCell data-testid={`text-price-${ad._id}`}>
                          {ad.price ? `$${ad.price}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusVariants[ad.status] || "secondary"}
                            data-testid={`badge-status-${ad._id}`}
                          >
                            {statusLabels[ad.status] || ad.status}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-owner-${ad._id}`}>
                          {getOwnerDisplay(ad.owner)}
                        </TableCell>
                        <TableCell data-testid={`text-created-${ad._id}`}>
                          {new Date(ad.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStatusMutation.mutate({ adId: ad._id, status: "active" })
                              }
                              disabled={updateStatusMutation.isPending || ad.status === "active"}
                              data-testid={`button-activate-${ad._id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Activate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStatusMutation.mutate({ adId: ad._id, status: "pending" })
                              }
                              disabled={updateStatusMutation.isPending || ad.status === "pending"}
                              data-testid={`button-pending-${ad._id}`}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Pending
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                updateStatusMutation.mutate({ adId: ad._id, status: "blocked" })
                              }
                              disabled={updateStatusMutation.isPending || ad.status === "blocked"}
                              data-testid={`button-block-${ad._id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Block
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
