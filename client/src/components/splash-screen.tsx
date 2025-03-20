import { useState, useEffect } from "react";
import { Logo } from "@/components/logo";

export function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Delay the fade-out animation
    const timer = setTimeout(() => {
      setShow(false);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="text-center">
        <Logo className="w-32 h-32 mx-auto animate-[spin_3s_ease-in-out] transition-transform" />
        <h1 className="mt-4 text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-[slide-up_0.5s_ease-out]">
          ElServe
        </h1>
      </div>
    </div>
  );
}