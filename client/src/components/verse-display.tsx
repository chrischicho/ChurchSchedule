import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Verse } from "@shared/schema";
import { QuoteIcon } from "lucide-react";

interface VerseDisplayProps {
  className?: string;
  category?: string;
}

export function VerseDisplay({ className, category = "serving" }: VerseDisplayProps) {
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true on the client-side after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: verse, isLoading, error } = useQuery<Verse>({
    queryKey: ["/api/verse/random", { category }],
    enabled: isClient, // Only run the query on the client side
  });

  if (isLoading) {
    return (
      <Card className={`${className} p-4 animate-pulse`}>
        <CardContent className="space-y-2 pt-4">
          <div className="h-20 bg-primary/10 rounded" />
          <div className="h-4 w-1/3 bg-primary/10 rounded mt-2" />
        </CardContent>
      </Card>
    );
  }

  if (error || !verse) {
    return null;
  }

  return (
    <Card className={`${className} bg-primary/5 border-primary/20`}>
      <CardContent className="pt-6 pb-4 px-6 relative">
        <QuoteIcon className="h-10 w-10 text-primary/20 absolute -top-4 -left-4" />
        <div className="flex flex-col space-y-2">
          <p className="italic text-sm md:text-base">"{verse.text}"</p>
          <p className="text-right text-xs md:text-sm font-semibold text-primary">— {verse.reference}</p>
        </div>
      </CardContent>
    </Card>
  );
}