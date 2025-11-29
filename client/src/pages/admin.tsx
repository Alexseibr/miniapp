import AdminAdsTab from "@/components/admin/AdminAdsTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminFraudTab from "@/components/admin/AdminFraudTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Users, PackageOpen, AlertTriangle } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-admin">
          <ShieldCheck className="h-8 w-8" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage ads, users, and moderate marketplace content
        </p>
      </div>

      <Tabs defaultValue="ads" className="space-y-6">
        <TabsList data-testid="tabs-admin">
          <TabsTrigger value="ads" data-testid="tab-ads">
            <PackageOpen className="h-4 w-4 mr-2" />
            Ads Management
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users Management
          </TabsTrigger>
          <TabsTrigger value="fraud" data-testid="tab-fraud">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Fraud Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ads" data-testid="tab-content-ads">
          <AdminAdsTab />
        </TabsContent>

        <TabsContent value="users" data-testid="tab-content-users">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="fraud" data-testid="tab-content-fraud">
          <AdminFraudTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
