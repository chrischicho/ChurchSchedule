import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { format, startOfMonth, addMonths, eachDayOfInterval, isSunday, subMonths } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Availability } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: availabilities, isLoading } = useQuery<Availability[]>({
    queryKey: ["/api/availability"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { serviceDate: string; isAvailable: boolean }) => {
      const res = await apiRequest("POST", "/api/availability", {
        serviceDate: data.serviceDate,
        isAvailable: data.isAvailable,
        userId: user?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get all days in the interval and filter for Sundays
  const sundays = eachDayOfInterval({
    start: selectedMonth,
    end: addMonths(selectedMonth, 1),
  }).filter(day => isSunday(day));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">My Availability</h1>
          <div className="flex items-center gap-4 bg-muted px-3 py-1.5 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedMonth(prev => startOfMonth(subMonths(prev, 1)))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[120px] text-center font-medium">
              {format(selectedMonth, "MMMM yyyy")}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedMonth(prev => startOfMonth(addMonths(prev, 1)))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {sundays.map((sunday) => {
            const availability = availabilities?.find(
              (a) =>
                format(new Date(a.serviceDate), "yyyy-MM-dd") ===
                format(sunday, "yyyy-MM-dd") &&
                a.userId === user?.id
            );

            return (
              <Card key={sunday.toISOString()}>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <h3 className="font-medium">
                      {format(sunday, "MMMM d, yyyy")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Sunday Service
                    </p>
                  </div>
                  <Switch
                    checked={availability?.isAvailable ?? false}
                    onCheckedChange={(checked) =>
                      updateMutation.mutate({
                        serviceDate: format(sunday, "yyyy-MM-dd"),
                        isAvailable: checked,
                      })
                    }
                    className="switch-transition"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}