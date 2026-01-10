import { useEffect } from "react";

interface SEOHeadProps {
  path: string;
  title?: string;
  description?: string;
}

const PRODUCTION_DOMAIN = "https://arclo.pro";

export function SEOHead({ path, title, description }: SEOHeadProps) {
  useEffect(() => {
    const hostname = window.location.hostname;
    const isProduction = hostname === "arclo.pro" || hostname === "www.arclo.pro" || hostname === "arclo.io" || hostname === "www.arclo.io";
    const baseUrl = isProduction ? PRODUCTION_DOMAIN : window.location.origin;
    const canonicalUrl = `${baseUrl}${path}`;

    let canonicalTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.rel = "canonical";
      document.head.appendChild(canonicalTag);
    }
    
    canonicalTag.href = canonicalUrl;

    if (title) {
      document.title = title;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (ogTitle) ogTitle.setAttribute("content", title);
      if (twitterTitle) twitterTitle.setAttribute("content", title);
    }

    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.name = "description";
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = description;

      const ogDescription = document.querySelector('meta[property="og:description"]');
      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      if (ogDescription) ogDescription.setAttribute("content", description);
      if (twitterDescription) twitterDescription.setAttribute("content", description);
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", canonicalUrl);

    return () => {};
  }, [path, title, description]);

  return null;
}
