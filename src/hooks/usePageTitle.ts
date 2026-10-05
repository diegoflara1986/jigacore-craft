import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - SGP` : "SGP";
    return () => { document.title = "SGP"; };
  }, [title]);
}
