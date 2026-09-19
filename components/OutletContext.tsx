"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface OutletData {
  id: string;
  name: string;
  code?: string | null;
  type?: string;
  icon: string;
  shifts?: string[];
  templates?: Array<{
    id: string;
    slug: string;
    title: string;
    category: string;
    icon: string;
    description?: string | null;
  }>;
}

interface OutletContextType {
  activeOutlet: OutletData | null;
  setOutlet: (outletId: string) => void;
  outlets: OutletData[];
  loading: boolean;
  refreshOutlets: () => Promise<void>;
}

const OutletContext = createContext<OutletContextType>({
  activeOutlet: null,
  setOutlet: () => {},
  outlets: [],
  loading: true,
  refreshOutlets: async () => {},
});

export function OutletProvider({
  children,
  initialOutletId,
  initialOutlets = [],
}: {
  children: React.ReactNode;
  initialOutletId?: string;
  initialOutlets?: OutletData[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [outlets, setOutlets] = useState<OutletData[]>(initialOutlets);
  const [activeOutletId, setActiveOutletId] = useState<string>(
    initialOutletId || initialOutlets[0]?.id || ""
  );
  const [loading, setLoading] = useState<boolean>(initialOutlets.length === 0);

  const fetchOutlets = async () => {
    try {
      const res = await fetch("/api/admin/outlets");
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.outlets || []).map((o: any) => ({
          id: o.id,
          name: o.name,
          code: o.code,
          type: o.type,
          icon: o.icon || "📍",
          shifts: o.shifts,
          templates: (o.outletTemplates || []).map((ot: any) => ot.template),
        }));
        setOutlets(mapped);
        if (!activeOutletId && mapped.length > 0) {
          setActiveOutletId(mapped[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load outlets", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const setOutlet = (outletId: string) => {
    setActiveOutletId(outletId);
    document.cookie = `pnr_outlet=${outletId}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Find target outlet
    const target = outlets.find((o) => o.id === outletId);
    if (target && target.templates && target.templates.length > 0) {
      const firstTemplate = target.templates[0];
      router.push(`/${target.id}/${firstTemplate.slug}`);
    } else {
      router.push("/dashboard");
    }
  };

  const activeOutlet = outlets.find((o) => o.id === activeOutletId) || outlets[0] || null;

  return (
    <OutletContext.Provider
      value={{
        activeOutlet,
        setOutlet,
        outlets,
        loading,
        refreshOutlets: fetchOutlets,
      }}
    >
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet() {
  return useContext(OutletContext);
}
