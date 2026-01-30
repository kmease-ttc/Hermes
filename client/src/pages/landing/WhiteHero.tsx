import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Building2, CalendarX, ClipboardList, Sparkles, Search, Menu, X, MapPin, ChevronDown } from "lucide-react";
import { ROUTES } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { BrandButton } from "@/components/marketing/BrandButton";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";

/**
 * White Hero (high-contrast) — matches the approved "clean white" mock.
 * - Clean white surface
 * - Subtle cosmic glow in the background
 * - Reduced copy (no redundant paragraph)
 * - Clear primary vs secondary CTAs
 * - Mobile hamburger menu for small screens
 * - URL-only form → location popup before scan starts
 */

const TRUST_PILLS = [
  { icon: Building2, text: "Built for your business" },
  { icon: CalendarX, text: "Cancel anytime" },
  { icon: ClipboardList, text: "Changes tracked" },
  { icon: Sparkles, text: "Best practices, automated" },
];

const US_STATES: { abbr: string; name: string }[] = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" }, { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" }, { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" }, { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" }, { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" }, { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" }, { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" }, { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" }, { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" }, { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" }, { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" }, { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" }, { abbr: "PA", name: "Pennsylvania" }, { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" }, { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" }, { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" }, { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" }, { abbr: "WY", name: "Wyoming" }, { abbr: "DC", name: "Washington D.C." },
];

// Major cities per state (top cities by population)
const STATE_CITIES: Record<string, string[]> = {
  AL: ["Birmingham", "Montgomery", "Huntsville", "Mobile", "Tuscaloosa"],
  AK: ["Anchorage", "Fairbanks", "Juneau", "Sitka", "Wasilla"],
  AZ: ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Gilbert", "Tempe", "Glendale"],
  AR: ["Little Rock", "Fort Smith", "Fayetteville", "Springdale", "Jonesboro"],
  CA: ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento", "Fresno", "Oakland", "Long Beach", "Irvine", "Anaheim"],
  CO: ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Boulder"],
  CT: ["Bridgeport", "New Haven", "Hartford", "Stamford", "Waterbury"],
  DE: ["Wilmington", "Dover", "Newark", "Middletown", "Bear"],
  FL: ["Miami", "Orlando", "Tampa", "Jacksonville", "St. Petersburg", "Fort Lauderdale", "Tallahassee", "Naples", "Sarasota"],
  GA: ["Atlanta", "Savannah", "Augusta", "Columbus", "Macon", "Athens"],
  HI: ["Honolulu", "Hilo", "Kailua", "Kapolei", "Pearl City"],
  ID: ["Boise", "Meridian", "Nampa", "Idaho Falls", "Caldwell"],
  IL: ["Chicago", "Aurora", "Naperville", "Rockford", "Springfield", "Peoria"],
  IN: ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel"],
  IA: ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City"],
  KS: ["Wichita", "Overland Park", "Kansas City", "Olathe", "Topeka"],
  KY: ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington"],
  LA: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Lake Charles"],
  ME: ["Portland", "Lewiston", "Bangor", "Auburn", "South Portland"],
  MD: ["Baltimore", "Columbia", "Germantown", "Silver Spring", "Annapolis"],
  MA: ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell"],
  MI: ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Ann Arbor", "Lansing"],
  MN: ["Minneapolis", "St. Paul", "Rochester", "Bloomington", "Duluth"],
  MS: ["Jackson", "Gulfport", "Southaven", "Biloxi", "Hattiesburg"],
  MO: ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence"],
  MT: ["Billings", "Missoula", "Great Falls", "Bozeman", "Helena"],
  NE: ["Omaha", "Lincoln", "Bellevue", "Grand Island", "Kearney"],
  NV: ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks"],
  NH: ["Manchester", "Nashua", "Concord", "Dover", "Rochester"],
  NJ: ["Newark", "Jersey City", "Paterson", "Elizabeth", "Trenton", "Princeton"],
  NM: ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe", "Roswell"],
  NY: ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse", "Yonkers"],
  NC: ["Charlotte", "Raleigh", "Durham", "Greensboro", "Winston-Salem", "Asheville"],
  ND: ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo"],
  OH: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton"],
  OK: ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Edmond"],
  OR: ["Portland", "Salem", "Eugene", "Gresham", "Hillsboro", "Bend"],
  PA: ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton"],
  RI: ["Providence", "Warwick", "Cranston", "Pawtucket", "East Providence"],
  SC: ["Charleston", "Columbia", "Greenville", "Rock Hill", "Myrtle Beach"],
  SD: ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown"],
  TN: ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville"],
  TX: ["Houston", "Dallas", "San Antonio", "Austin", "Fort Worth", "El Paso", "Plano", "Arlington"],
  UT: ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem", "St. George"],
  VT: ["Burlington", "South Burlington", "Rutland", "Montpelier", "Barre"],
  VA: ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Arlington", "Alexandria"],
  WA: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kent"],
  WV: ["Charleston", "Huntington", "Morgantown", "Parkersburg", "Wheeling"],
  WI: ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine"],
  WY: ["Cheyenne", "Casper", "Laramie", "Gillette", "Rock Springs"],
  DC: ["Washington"],
};

export default function WhiteHero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) closeMobileMenu();
    };
    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  useEffect(() => {
    if (mobileMenuOpen && menuRef.current) {
      const focusable = menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      };
      document.addEventListener("keydown", handleTab);
      first?.focus();
      return () => document.removeEventListener("keydown", handleTab);
    }
  }, [mobileMenuOpen]);

  // Location modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [normalizedUrlForModal, setNormalizedUrlForModal] = useState("");

  const normalizeUrl = (input: string): string => {
    let normalized = input.trim().toLowerCase();
    if (!normalized) return "";
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }
    return normalized;
  };

  const cityOptions = useMemo(() => {
    if (!selectedState) return [];
    return STATE_CITIES[selectedState] || [];
  }, [selectedState]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalized = normalizeUrl(url);
    if (!normalized || !normalized.includes(".")) {
      setError("Please enter a valid website.");
      return;
    }

    setNormalizedUrlForModal(normalized);
    setSelectedState("NATIONAL");
    setSelectedCity("");
    setShowLocationModal(true);
  };

  const handleLocationSubmit = async () => {
    const isNational = selectedState === "NATIONAL";

    if (!isNational && (!selectedState || !selectedCity)) {
      setError("Please select your state and city, or choose National.");
      return;
    }

    setError("");
    setShowLocationModal(false);

    // Build scan payload
    const scanPayload: any = { url: normalizedUrlForModal };
    if (!isNational) {
      const stateName = US_STATES.find((s) => s.abbr === selectedState)?.name || selectedState;
      scanPayload.geoLocation = { city: selectedCity, state: stateName };
    }

    // Store payload and navigate to loading screen immediately
    sessionStorage.setItem("arclo_scan_payload", JSON.stringify(scanPayload));
    navigate("/scan/preview/pending");
  };

  return (
    <div className="arclo-hero-wrap">
      <div className="arclo-hero-glow" />

      <div className="arclo-hero-container">
        <header className="sticky top-0 z-50 w-full border-b border-[#CBD5E1] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <Link href={ROUTES.LANDING}>
              <div className="flex items-center cursor-pointer">
                <img src={arcloLogo} alt="Arclo" className="h-10 w-auto" fetchPriority="high" />
              </div>
            </Link>

            <nav className="flex items-center gap-4 md:gap-6">
              <Link href={ROUTES.EXAMPLES} className="hidden md:block">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium">Examples</span>
              </Link>
              <Link href={ROUTES.HOW_IT_WORKS} className="hidden md:block">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium">How It Works</span>
              </Link>
              <Link href={ROUTES.PRICING} className="hidden md:block">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium">Pricing</span>
              </Link>
              <Link href="/login" className="hidden md:block">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium">Log In</span>
              </Link>
              <Link href={ROUTES.WEBSITE_GENERATOR} className="hidden md:block">
                <BrandButton variant="blue" size="sm" icon={Sparkles}>Generate My Site</BrandButton>
              </Link>
              <Link href={ROUTES.SCAN} className="hidden md:block">
                <Button
                  size="sm"
                  className="gap-2 font-medium"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)", color: "#FFFFFF" }}
                >
                  <Search className="h-4 w-4" />
                  Analyze My Website
                </Button>
              </Link>
              <button
                ref={menuButtonRef}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </nav>
          </div>
        </header>

        {mobileMenuOpen && (
          <div
            ref={menuRef}
            className="fixed inset-0 top-16 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
              <Link href={ROUTES.EXAMPLES} onClick={closeMobileMenu}>
                <span className="block py-3 text-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium border-b border-border">Examples</span>
              </Link>
              <Link href={ROUTES.HOW_IT_WORKS} onClick={closeMobileMenu}>
                <span className="block py-3 text-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium border-b border-border">How It Works</span>
              </Link>
              <Link href={ROUTES.PRICING} onClick={closeMobileMenu}>
                <span className="block py-3 text-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium border-b border-border">Pricing</span>
              </Link>
              <Link href="/login" onClick={closeMobileMenu}>
                <span className="block py-3 text-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium border-b border-border">Log In</span>
              </Link>
              <div className="flex flex-col gap-3 pt-4">
                <Link href={ROUTES.WEBSITE_GENERATOR} onClick={closeMobileMenu}>
                  <BrandButton variant="blue" size="lg" icon={Sparkles} className="w-full">Generate My Site</BrandButton>
                </Link>
                <Link href={ROUTES.SCAN} onClick={closeMobileMenu}>
                  <Button
                    size="lg"
                    className="w-full gap-2 font-medium"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)", color: "#FFFFFF" }}
                  >
                    <Search className="h-4 w-4" />
                    Analyze My Website
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}

        <main className="arclo-hero">
          <h1 className="arclo-h1">
            Autonomous SEO that <br />
            grows <span className="emph">traffic</span> — without guesswork.
          </h1>

          <div className="arclo-sub">Weekly fixes you can approve, apply, and track.</div>

          <div className="arclo-steps" aria-label="How it works steps">
            <div className="step">
              <span className="bullet green" />
              <span>Scan your site</span>
            </div>
            <span className="arrow">→</span>
            <div className="step">
              <span className="bullet purple" />
              <span>Identify what's holding rankings back</span>
            </div>
            <span className="arrow">→</span>
            <div className="step">
              <span className="bullet orange" />
              <span>Apply fixes week-by-week</span>
            </div>
          </div>

          <form className="arclo-cta" onSubmit={handleFormSubmit}>
            <input
              className="arclo-input"
              placeholder="Add your site here"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              type="submit"
              className="arclo-btn arclo-btn-primary arclo-primary-cta"
            >
              Analyze My Website
            </button>
          </form>

          {error && <div className="arclo-error">{error}</div>}

          <div className="arclo-micro">Free scan • No credit card • Takes ~60 seconds</div>

          <Link href={ROUTES.WEBSITE_GENERATOR}>
            <BrandButton variant="blue" size="sm" icon={Sparkles}>
              Generate My Site
            </BrandButton>
          </Link>

          <div className="arclo-pill-row" aria-label="Trust factors">
            {TRUST_PILLS.map((pill) => (
              <div key={pill.text} className="arclo-trust-pill">
                <span className="arclo-trust-icon">
                  <pill.icon size={14} strokeWidth={2.5} />
                </span>
                <span>{pill.text}</span>
              </div>
            ))}
          </div>

          <div className="arclo-hairline" />
        </main>
      </div>

      {/* Location selection modal */}
      {showLocationModal && (
        <div className="arclo-modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="arclo-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="arclo-modal-close"
              onClick={() => setShowLocationModal(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="arclo-modal-icon">
              <MapPin size={28} />
            </div>

            <h2 className="arclo-modal-title">Where do you want to rank?</h2>
            <p className="arclo-modal-subtitle">
              Select the location where your customers search for your business.
            </p>

            <div className="arclo-modal-fields">
              <label className="arclo-modal-label">
                Scope
                <div className="arclo-select-wrap">
                  <select
                    className="arclo-select"
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedCity("");
                    }}
                  >
                    <option value="NATIONAL">National (United States)</option>
                    {US_STATES.map((s) => (
                      <option key={s.abbr} value={s.abbr}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="arclo-select-icon" />
                </div>
              </label>

              {selectedState !== "NATIONAL" && (
                <label className="arclo-modal-label">
                  City
                  <div className="arclo-select-wrap">
                    <select
                      className="arclo-select"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      disabled={!selectedState}
                    >
                      <option value="">Select a city</option>
                      {cityOptions.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="arclo-select-icon" />
                  </div>
                </label>
              )}
            </div>

            <button
              className="arclo-btn arclo-btn-primary arclo-modal-submit"
              onClick={handleLocationSubmit}
              disabled={selectedState !== "NATIONAL" && (!selectedState || !selectedCity)}
            >
              Start Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
