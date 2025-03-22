import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
      <div className={`${className} animate-pulse border-l-2 border-primary/20 pl-3 py-1`}>
        <div className="h-8 bg-primary/5 rounded-sm" />
        <div className="h-3 w-1/3 bg-primary/5 rounded-sm mt-2 ml-auto" />
      </div>
    );
  }

  if (error || !verse) {
    return null;
  }

  return (
    <div className={`${className} text-muted-foreground relative border-l-2 border-primary/20 pl-3 py-1`}>
      <QuoteIcon className="h-3 w-3 text-primary/30 absolute -top-1 -left-1" />
      <p className="italic text-xs leading-tight">"{verse.text}"</p>
      <p className="text-right text-xs font-medium text-primary/70 mt-1">— {verse.reference}</p>
    </div>
  );
}