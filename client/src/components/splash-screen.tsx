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
        <Logo className="w-48 h-48 mx-auto animate-[scale-in_1s_ease-out] transition-all" />
      </div>
    </div>
  );
}