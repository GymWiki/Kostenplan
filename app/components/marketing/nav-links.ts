// Gedeeld tussen SiteHeader (desktop, gestaffelde zichtbaarheid per
// breakpoint) en MobileNav (het drawer-menu, altijd de volledige lijst) —
// vóór de audit bestond dit alleen inline in site-header.tsx, wat MobileNav
// zonder duplicatie onmogelijk maakte.
export const NAV_LINKS = [
  { href: "/features", label: "Functionaliteiten", breakpoint: "sm:inline-flex" },
  { href: "/voor", label: "Voor vakmensen", breakpoint: "md:inline-flex" },
  { href: "/kennisbank", label: "Kennisbank", breakpoint: "md:inline-flex" },
  { href: "/blog", label: "Blog", breakpoint: "lg:inline-flex" },
  { href: "/prijzen", label: "Prijzen", breakpoint: "sm:inline-flex" },
];
