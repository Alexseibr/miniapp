import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Shield, 
  TrendingDown, 
  Eye, 
  RefreshCw,
  CheckCircle,
  XCircle,
  User,
  Star,
  BarChart3
} from "lucide-react";

interface FraudOverview {
  dailyStats: Array<{
    date: string;
    totalFeedback: number;
    avgScore: number;
    lowScores: number;
    fraudReports: number;
  }>;
  reasonDistribution: Record<string, number>;
  scoreDistribution: Record<string, number>;
  summary: {
    suspiciousAds: number;
    hiddenByRating: number;
    suspiciousSellers: number;
  };
}

interface SuspiciousAd {
  _id: string;
  avgScore: number;
  totalVotes: number;
  lowScoreCount: number;
  fraudFlags: number;
  ad?: {
    title: string;
    price: number;
    currency: string;
    photos?: string[];
    previewUrl?: string;
    status: string;
  };
}

interface SuspiciousSeller {
  _id: string;
  avgScore: number;
  totalVotes: number;
  lowScoreCount: number;
  fraudFlags: number;
  seller?: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

export default function AdminFraudTab() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: overview, isLoading: overviewLoading } = useQuery<FraudOverview>({
    queryKey: ["/api/admin/rating/fraud/overview"],
  });

  const { data: suspiciousAds, isLoading: adsLoading } = useQuery<{ items: SuspiciousAd[] }>({
    queryKey: ["/api/admin/rating/fraud/suspicious-ads"],
  });

  const { data: suspiciousSellers, isLoading: sellersLoading } = useQuery<{ items: SuspiciousSeller[] }>({
    queryKey: ["/api/admin/rating/fraud/suspicious-sellers"],
  });

  const clearFlagsMutation = useMutation({
    mutationFn: async (adId: string) => {
      await apiRequest("POST", `/api/admin/rating/ads/${adId}/clear-flags`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rating/fraud/suspicious-ads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rating/fraud/overview"] });
    },
  });

  const markSuspiciousMutation = useMutation({
    mutationFn: async ({ adId, reason }: { adId: string; reason: string }) => {
      await apiRequest("POST", `/api/admin/rating/ads/${adId}/mark-suspicious`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rating/fraud/suspicious-ads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rating/fraud/overview"] });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "ad" | "seller"; id: string }) => {
      const endpoint = type === "ad" 
        ? `/api/admin/rating/ads/${id}/recalculate`
        : `/api/admin/rating/sellers/${id}/recalculate`;
      await apiRequest("POST", endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rating/fraud/suspicious-ads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rating/fraud/suspicious-sellers"] });
    },
  });

  const getScoreColor = (score: number) => {
    if (score < 2.5) return "destructive";
    if (score < 3.5) return "secondary";
    return "default";
  };

  const reasonLabels: Record<string, string> = {
    no_response: "No Response",
    wrong_price: "Wrong Price",
    wrong_description: "Wrong Description",
    fake: "Fake Ad",
    rude: "Rude Seller",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <Card data-testid="card-fraud-summary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Fraud Detection Summary
          </CardTitle>
          <CardDescription>
            Overview of suspicious activity and fraud reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : overview ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium">Suspicious Ads</span>
                  </div>
                  <p className="text-3xl font-bold mt-2" data-testid="stat-suspicious-ads">
                    {overview.summary.suspiciousAds}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-orange-500/10 border-orange-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium">Hidden by Rating</span>
                  </div>
                  <p className="text-3xl font-bold mt-2" data-testid="stat-hidden-by-rating">
                    {overview.summary.hiddenByRating}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-yellow-500/10 border-yellow-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-medium">Suspicious Sellers</span>
                  </div>
                  <p className="text-3xl font-bold mt-2" data-testid="stat-suspicious-sellers">
                    {overview.summary.suspiciousSellers}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-fraud-details">
          <TabsTrigger value="overview" data-testid="tab-fraud-overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="ads" data-testid="tab-fraud-ads">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Suspicious Ads
          </TabsTrigger>
          <TabsTrigger value="sellers" data-testid="tab-fraud-sellers">
            <User className="h-4 w-4 mr-2" />
            Suspicious Sellers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {overviewLoading ? (
            <Skeleton className="h-64" />
          ) : overview ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((score) => {
                      const count = overview.scoreDistribution[score] || 0;
                      const total = Object.values(overview.scoreDistribution).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      
                      return (
                        <div key={score} className="flex items-center gap-2">
                          <div className="flex items-center gap-1 w-16">
                            <Star className="h-4 w-4" />
                            <span className="text-sm">{score}</span>
                          </div>
                          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${score <= 2 ? 'bg-destructive' : score === 3 ? 'bg-orange-500' : 'bg-green-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Negative Feedback Reasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(overview.reasonDistribution).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between">
                        <Badge variant={reason === "fake" ? "destructive" : "secondary"}>
                          {reasonLabels[reason] || reason}
                        </Badge>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                    {Object.keys(overview.reasonDistribution).length === 0 && (
                      <p className="text-sm text-muted-foreground">No negative feedback yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          {adsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : suspiciousAds?.items.length ? (
            <div className="space-y-2">
              {suspiciousAds.items.map((item) => (
                <Card key={item._id} data-testid={`card-suspicious-ad-${item._id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {item.ad?.previewUrl && (
                          <img 
                            src={item.ad.previewUrl} 
                            alt={item.ad.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <h3 className="font-medium">{item.ad?.title || "Unknown Ad"}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getScoreColor(item.avgScore)}>
                              <Star className="h-3 w-3 mr-1" />
                              {item.avgScore.toFixed(1)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {item.totalVotes} votes
                            </span>
                            {item.fraudFlags > 0 && (
                              <Badge variant="destructive">
                                {item.fraudFlags} fraud reports
                              </Badge>
                            )}
                          </div>
                          {item.ad?.status && (
                            <Badge variant="outline" className="mt-1">
                              {item.ad.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => recalculateMutation.mutate({ type: "ad", id: item._id })}
                          disabled={recalculateMutation.isPending}
                          data-testid={`button-recalculate-ad-${item._id}`}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => clearFlagsMutation.mutate(item._id)}
                          disabled={clearFlagsMutation.isPending}
                          data-testid={`button-clear-flags-${item._id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => markSuspiciousMutation.mutate({ adId: item._id, reason: "manual" })}
                          disabled={markSuspiciousMutation.isPending}
                          data-testid={`button-mark-suspicious-${item._id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-muted-foreground">No suspicious ads found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sellers" className="space-y-4">
          {sellersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : suspiciousSellers?.items.length ? (
            <div className="space-y-2">
              {suspiciousSellers.items.map((item) => (
                <Card key={item._id} data-testid={`card-suspicious-seller-${item._id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          <h3 className="font-medium">
                            {item.seller?.firstName || item.seller?.username || `User ${item.seller?.telegramId}`}
                            {item.seller?.lastName && ` ${item.seller.lastName}`}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getScoreColor(item.avgScore)}>
                            <Star className="h-3 w-3 mr-1" />
                            {item.avgScore.toFixed(1)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {item.totalVotes} votes
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {item.lowScoreCount} low scores
                          </span>
                          {item.fraudFlags > 0 && (
                            <Badge variant="destructive">
                              {item.fraudFlags} fraud flags
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => recalculateMutation.mutate({ type: "seller", id: item._id })}
                        disabled={recalculateMutation.isPending}
                        data-testid={`button-recalculate-seller-${item._id}`}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-muted-foreground">No suspicious sellers found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
