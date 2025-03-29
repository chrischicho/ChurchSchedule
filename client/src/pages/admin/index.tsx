import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpecialDaysManager } from "./components/special-days";
import { MemberManagement } from "./components/member-management";
import { AdminSettings } from "./components/settings";
import { Cog, Users, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export function AdminPage() {
  const [location, setLocation] = useLocation();
  
  // Get the active tab from the URL hash or default to "special-days"
  const getActiveTab = () => {
    const hash = window.location.hash.replace("#", "");
    
    if (["special-days", "members", "settings"].includes(hash)) {
      return hash;
    }
    
    return "special-days";
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update the URL hash when the tab changes
  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  // Listen for hash changes in the URL
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getActiveTab());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex overflow-auto pb-2">
          <TabsList>
            <TabsTrigger value="special-days" className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              <span>Special Days</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              <span>Member Management</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Cog className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="special-days" className="space-y-4">
          <SpecialDaysManager />
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <MemberManagement />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminPage;