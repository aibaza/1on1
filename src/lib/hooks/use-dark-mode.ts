import { useEffect, useState } from "react";

/**
 * Returns true if the current theme is dark mode.
 * Reads the `dark` class from <html> (set by next-themes).
 */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    function check() {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
    check();

    // Watch for class changes on <html> (next-themes toggles `dark` class)
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
