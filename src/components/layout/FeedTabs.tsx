import { NavLink } from "react-router-dom";
import { FiFileText, FiGrid, FiGlobe, FiBookmark } from "react-icons/fi";
import type { IconType } from "react-icons";

export interface FeedTab {
  to: string;
  label: string;
  icon: IconType;
}

// The same four pages as the desktop Sidebar. They are listed here on purpose,
// so this file does not depend on anything the Sidebar exports.
export const FEED_TABS: FeedTab[] = [
  { to: "/feed", label: "Feed", icon: FiFileText },
  { to: "/my-posts", label: "My Posts", icon: FiGrid },
  { to: "/community", label: "Community", icon: FiGlobe },
  { to: "/saved", label: "Saved", icon: FiBookmark },
];

/**
 * Feed / My Posts / Community / Saved switcher for screens where the desktop
 * Sidebar is hidden (below the `lg` breakpoint). The icons are dropped on the
 * smallest screens so all four tabs fit. It sits at the top of the page content,
 * right under the navbar, and scrolls away with the page like everything else.
 */
export default function FeedTabs() {
  return (
    <nav
      aria-label="Posts"
      className="lg:hidden mb-4 flex gap-1 overflow-x-auto bg-white border border-gray-200 rounded-xl p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {FEED_TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-rp-navy/10 text-rp-navy" : "text-gray-600 hover:bg-gray-50"
            }`
          }
        >
          <Icon className="hidden sm:block text-base" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}