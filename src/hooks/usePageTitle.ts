import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - Power SGP` : "Power SGP";
    return () => { document.title = "Power SGP"; };
  }, [title]);
}
