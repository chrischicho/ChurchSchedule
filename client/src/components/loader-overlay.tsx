import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChurchLoader, LoaderType } from "@/components/church-loader";
import { cn } from "@/lib/utils";

interface LoaderOverlayProps {
  isLoading: boolean;
  loadingText?: string;
  type?: LoaderType;
  size?: "xs" | "sm" | "md" | "lg";
  fullScreen?: boolean;
  className?: string;
}

/**
 * LoaderOverlay - A component to display a loading spinner in an overlay
 * 
 * Can be used in two ways:
 * 1. As a modal dialog (default) - for blocking operations
 * 2. As a full-screen overlay - when set fullScreen=true
 */
export function LoaderOverlay({
  isLoading,
  loadingText = "Loading...",
  type = "church",
  size = "md",
  fullScreen = false,
  className,
}: LoaderOverlayProps) {
  if (!isLoading) return null;
  
  if (fullScreen) {
    return (
      <div 
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
          className
        )}
      >
        <ChurchLoader 
          type={type} 
          size={size} 
          text={loadingText} 
        />
      </div>
    );
  }
  
  return (
    <Dialog open={isLoading} modal={true}>
      <DialogContent 
        className={cn(
          "flex flex-col items-center justify-center p-10 sm:max-w-md",
          className
        )}
      >
        <ChurchLoader 
          type={type} 
          size={size} 
          text={loadingText} 
        />
      </DialogContent>
    </Dialog>
  );
}