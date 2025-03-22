import React from "react";
import { motion } from "framer-motion";
import { Church, Cross, BookOpen, Bell, Users, Calendar, Music } from "lucide-react";
import { cn } from "@/lib/utils";

export type LoaderType = "church" | "cross" | "bible" | "bell" | "users" | "calendar" | "music";

interface ChurchLoaderProps {
  type?: LoaderType;
  size?: "xs" | "sm" | "md" | "lg";
  text?: string;
  className?: string;
  iconClassName?: string;
}

// Map sizes to pixel values
const sizeMap = {
  xs: {
    icon: 16,
    container: "h-8 w-8",
    text: "text-xs",
  },
  sm: {
    icon: 24,
    container: "h-12 w-12",
    text: "text-sm",
  },
  md: {
    icon: 32,
    container: "h-16 w-16", 
    text: "text-base",
  },
  lg: {
    icon: 48,
    container: "h-20 w-20",
    text: "text-lg",
  },
};

// Animation variants
const containerVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    }
  }
};

const iconVariants = {
  initial: { 
    scale: 0.8,
    opacity: 0.5 
  },
  animate: { 
    scale: [0.8, 1.1, 1],
    opacity: [0.5, 1, 0.7],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    }
  }
};

const pulseVariants = {
  initial: { 
    opacity: 0.5,
    scale: 0.9 
  },
  animate: {
    opacity: [0.5, 1, 0.5],
    scale: [0.9, 1.05, 0.9],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    }
  }
};

export function ChurchLoader({ 
  type = "church", 
  size = "md", 
  text, 
  className,
  iconClassName 
}: ChurchLoaderProps) {
  const iconSize = sizeMap[size].icon;
  const containerClass = sizeMap[size].container;
  const textClass = sizeMap[size].text;
  
  // Select the appropriate icon based on type
  const Icon = React.useMemo(() => {
    switch (type) {
      case "cross":
        return Cross;
      case "bible":
        return BookOpen;
      case "bell":
        return Bell;
      case "users":
        return Users;
      case "calendar":
        return Calendar;
      case "music":
        return Music;
      case "church":
      default:
        return Church;
    }
  }, [type]);
  
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={containerVariants}
      className={cn("flex flex-col items-center justify-center gap-2", className)}
    >
      <div className="relative">
        <motion.div
          variants={pulseVariants}
          className={cn(
            "flex items-center justify-center rounded-full bg-primary/10", 
            containerClass
          )}
        />
        <motion.div
          variants={iconVariants}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <Icon 
            size={iconSize} 
            className={cn("text-primary", iconClassName)} 
          />
        </motion.div>
      </div>
      
      {text && (
        <motion.p 
          className={cn("text-muted-foreground animate-pulse", textClass)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );
}