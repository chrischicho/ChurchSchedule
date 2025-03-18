import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "@/components/nav-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Availability } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function RosterPage() {
  const [selectedDate, setSelectedDate] = useState<string | "all">("all");

  const { data: availabilities, isLoading } = useQuery<Availability[]>({
    queryKey: ["/api/availability"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const dates = Array.from(
    new Set(
      availabilities?.map((a) =>
        format(new Date(a.serviceDate), "yyyy-MM-dd")
      ) || []
    )
  ).sort();

  const filteredAvailabilities =
    selectedDate === "all"
      ? availabilities
      : availabilities?.filter(
          (a) =>
            format(new Date(a.serviceDate), "yyyy-MM-dd") === selectedDate
        );

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Service Roster</h1>
          <select
            className="border rounded p-2"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="all">All Dates</option>
            {dates.map((date) => (
              <option key={date} value={date}>
                {format(new Date(date), "MMMM d, yyyy")}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAvailabilities?.map((availability) => (
                <TableRow key={availability.id}>
                  <TableCell>
                    {format(
                      new Date(availability.serviceDate),
                      "MMMM d, yyyy"
                    )}
                  </TableCell>
                  <TableCell>
                    {/* User name will be populated from join query */}
                    User {availability.userId}
                  </TableCell>
                  <TableCell>
                    {availability.isAvailable ? "Available" : "Unavailable"}
                  </TableCell>
                  <TableCell>
                    {format(
                      new Date(availability.lastUpdated),
                      "MMM d, h:mm a"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
