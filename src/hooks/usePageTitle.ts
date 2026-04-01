import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - Jigacore PM` : "Jigacore PM";
    return () => { document.title = "Jigacore PM"; };
  }, [title]);
}
