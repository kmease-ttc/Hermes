import { Link } from "wouter";
import { ROUTES } from "@shared/routes";

type FooterLinkProps = { href: string; children: React.ReactNode; external?: boolean };

function FooterLink({ href, children, external }: FooterLinkProps) {
  if (external || href.startsWith("#")) {
    return (
      <a 
        className="arclo-footer__link" 
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <Link className="arclo-footer__link" href={href}>
      {children}
    </Link>
  );
}

type SocialLinkProps = { href: string; label: string; children: React.ReactNode };

function SocialLink({ href, label, children }: SocialLinkProps) {
  return (
    <a
      className="arclo-footer__social"
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="arclo-footer" role="contentinfo" data-testid="site-footer">
      <div className="arclo-footer__inner">
        <div className="arclo-footer__top">
          {/* Brand */}
          <div className="arclo-footer__brand">
            <div className="arclo-footer__brandRow">
              <div className="arclo-footer__logoMark" aria-hidden="true">
                A
              </div>
              <div className="arclo-footer__brandName">Arclo</div>
            </div>

            <p className="arclo-footer__tagline">
              Autonomous SEO that ships weekly improvements—so you get results without guesswork.
            </p>

            <div className="arclo-footer__socialRow">
              <SocialLink href="#" label="Follow Arclo on X">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H2l7.4-8.5L1 2h6.4l4.4 5.9L18.9 2Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </SocialLink>

              <SocialLink href="#" label="Follow Arclo on LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6.5 9.5V20M6.5 6.2a1.7 1.7 0 1 0 0-.01ZM10.5 20v-6.2c0-3.2 4-3.5 4-0.2V20M14.5 13.2c0-3.8 7-4.1 7-0.5V20"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </SocialLink>
            </div>
          </div>

          {/* Link columns */}
          <div className="arclo-footer__cols">
            <div className="arclo-footer__col">
              <div className="arclo-footer__heading">Product</div>
              <FooterLink href={ROUTES.EXAMPLES}>Examples</FooterLink>
              <FooterLink href={ROUTES.HOW_IT_WORKS}>How It Works</FooterLink>
              <FooterLink href={ROUTES.PRICING}>Pricing</FooterLink>
              <FooterLink href={ROUTES.SCAN}>Analyze</FooterLink>
              <FooterLink href={ROUTES.WEBSITE_GENERATOR}>Generate</FooterLink>
            </div>

            <div className="arclo-footer__col">
              <div className="arclo-footer__heading">Company</div>
              <FooterLink href={ROUTES.PRIVACY}>Privacy</FooterLink>
              <FooterLink href={ROUTES.TERMS}>Terms</FooterLink>
              <FooterLink href={ROUTES.CONTACT}>Contact</FooterLink>
            </div>

            <div className="arclo-footer__col">
              <div className="arclo-footer__heading">Resources</div>
              <FooterLink href={ROUTES.HELP}>Support</FooterLink>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="arclo-footer__bottom">
          <div className="arclo-footer__copyright">
            © {year} Arclo. All rights reserved.
          </div>

          <div className="arclo-footer__legal">
            <Link className="arclo-footer__link arclo-footer__link--small" href={ROUTES.PRIVACY}>
              Privacy
            </Link>
            <span className="arclo-footer__dot" aria-hidden="true">
              •
            </span>
            <Link className="arclo-footer__link arclo-footer__link--small" href={ROUTES.TERMS}>
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
