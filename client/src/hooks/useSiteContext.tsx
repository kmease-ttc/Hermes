import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface Site {
  id: number;
  siteId: string;
  displayName: string;
  baseUrl: string;
  category: string | null;
  techStack: string | null;
  status: string;
  healthScore: number | null;
  lastDiagnosisAt: string | null;
  integrations: any;
}

interface SiteContextType {
  sites: Site[];
  selectedSite: Site | null;
  selectedSiteId: string | null;
  setSelectedSiteId: (siteId: string) => void;
  isLoading: boolean;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

const STORAGE_KEY = 'seo_doctor_selected_site';

export function SiteProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const urlSiteId = params.get('siteId');
  
  const [selectedSiteId, setSelectedSiteIdState] = useState<string | null>(() => {
    if (urlSiteId) return urlSiteId;
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  const { data: sites = [], isLoading } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await fetch('/api/sites');
      if (!res.ok) throw new Error('Failed to fetch sites');
      return res.json();
    },
  });

  useEffect(() => {
    if (!selectedSiteId && sites.length > 0) {
      setSelectedSiteIdState(sites[0].siteId);
    }
  }, [sites, selectedSiteId]);

  useEffect(() => {
    if (selectedSiteId) {
      localStorage.setItem(STORAGE_KEY, selectedSiteId);
    }
  }, [selectedSiteId]);

  const setSelectedSiteId = (siteId: string) => {
    setSelectedSiteIdState(siteId);
    localStorage.setItem(STORAGE_KEY, siteId);
  };

  const selectedSite = sites.find(s => s.siteId === selectedSiteId) || null;

  return (
    <SiteContext.Provider value={{
      sites,
      selectedSite,
      selectedSiteId,
      setSelectedSiteId,
      isLoading,
    }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSiteContext() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSiteContext must be used within a SiteProvider');
  }
  return context;
}
