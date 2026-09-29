// Site navigation, shared by the header and footer.

export interface NavLink {
  label: string;
  href: string;
}

export const HEATHROW_LINKS: NavLink[] = [
  { label: "Heathrow Airport Parking", href: "/heathrow-airport-parking" },
  { label: "Meet & Greet", href: "/heathrow-meet-and-greet" },
  { label: "Park & Ride", href: "/heathrow-park-and-ride" },
  { label: "Terminal 2", href: "/heathrow-terminal-2-parking" },
  { label: "Terminal 3", href: "/heathrow-terminal-3-parking" },
  { label: "Terminal 4", href: "/heathrow-terminal-4-parking" },
  { label: "Terminal 5", href: "/heathrow-terminal-5-parking" },
];

export const LUTON_LINKS: NavLink[] = [
  { label: "Luton Airport Parking", href: "/luton-airport-parking" },
  { label: "Meet & Greet", href: "/luton-meet-and-greet" },
  { label: "Park & Ride (coming soon)", href: "/luton-park-and-ride" },
];

export const MAIN_LINKS: NavLink[] = [
  { label: "Services", href: "/services" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Guides", href: "/guides" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const HELP_LINKS: NavLink[] = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Price guide", href: "/airport-parking-price-guide" },
  { label: "Parking guides", href: "/guides" },
  { label: "Manage a booking", href: "/manage" },
  // Listed on its own, not buried inside Manage Booking. Someone who has
  // deleted the confirmation email has no other way in, and a cancellation
  // nobody can find is what turns into a chargeback.
  { label: "Cancel a booking", href: "/cancel" },
  { label: "Contact us", href: "/contact" },
];

export const COMPANY_LINKS: NavLink[] = [
  { label: "About us", href: "/about" },
  { label: "Our services", href: "/services" },
  { label: "Terms & conditions", href: "/terms" },
  { label: "Privacy policy", href: "/privacy" },
];
