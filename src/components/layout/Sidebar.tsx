import { NavLink } from "react-router-dom";
import { FiFileText, FiGrid, FiGlobe, FiBookmark } from "react-icons/fi";
import type { IconType } from "react-icons";

interface SidebarItem {
  to: string;
  label: string;
  icon: IconType;
}

const items: SidebarItem[] = [
  { to: "/feed", label: "Feed", icon: FiFileText },
  { to: "/my-posts", label: "My Posts", icon: FiGrid },
  { to: "/community", label: "Community", icon: FiGlobe },
  { to: "/saved", label: "Saved", icon: FiBookmark },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <nav className="bg-white border border-gray-200 rounded-xl p-2 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-rp-navy/10 text-rp-navy"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <Icon className="text-base" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
