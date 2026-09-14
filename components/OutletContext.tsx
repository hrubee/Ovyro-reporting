"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { OUTLETS, DEFAULT_OUTLET, OutletConfig, getOutletById } from "@/lib/outlets";

interface OutletContextType {
  activeOutlet: OutletConfig;
  setOutlet: (outletId: string) => void;
  outlets: OutletConfig[];
}

const OutletContext = createContext<OutletContextType>({
  activeOutlet: DEFAULT_OUTLET,
  setOutlet: () => {},
  outlets: OUTLETS,
});

export function OutletProvider({
  children,
  initialOutletId,
}: {
  children: React.ReactNode;
  initialOutletId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeOutletId, setActiveOutletId] = useState<string>(
    initialOutletId || DEFAULT_OUTLET.id
  );

  // Sync if route belongs specifically to an outlet
  useEffect(() => {
    if (pathname.startsWith("/oreta")) {
      setActiveOutletId("oreta-world");
    } else if (
      pathname.startsWith("/hygiene") ||
      pathname.startsWith("/glass") ||
      pathname.startsWith("/fridge") ||
      pathname.startsWith("/kitchen") ||
      pathname.startsWith("/production") ||
      pathname.startsWith("/puff-room") ||
      pathname.startsWith("/cake-room")
    ) {
      setActiveOutletId("bakery");
    }
  }, [pathname]);

  const setOutlet = (outletId: string) => {
    setActiveOutletId(outletId);
    document.cookie = `pnr_outlet=${outletId}; path=/; max-age=31536000; SameSite=Lax`;
    
    // If we are on a specific sheet page of another outlet, switch gracefully
    if (outletId === "oreta-world" && !pathname.startsWith("/oreta") && !pathname.startsWith("/admin")) {
      router.push("/oreta/hygiene");
    } else if (outletId === "bakery" && pathname.startsWith("/oreta")) {
      router.push("/dashboard");
    } else {
      router.refresh();
    }
  };

  const activeOutlet = getOutletById(activeOutletId);

  return (
    <OutletContext.Provider value={{ activeOutlet, setOutlet, outlets: OUTLETS }}>
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet() {
  return useContext(OutletContext);
}
