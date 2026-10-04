import { NavLink, Outlet, type NavLinkRenderProps } from "react-router-dom";

const tabBase =
  "flex-1 text-center py-2.5 rounded-full text-sm font-semibold transition-colors";
const tabActive = "bg-white text-rp-navy shadow-sm";
const tabInactive = "text-gray-600 hover:text-gray-800";

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg shadow-blue-950/10 p-7">
        <div className="flex bg-gray-100 rounded-full p-1 mb-6">
          <NavLink
            to="/auth/login"
            className={({ isActive }: NavLinkRenderProps) =>
              `${tabBase} ${isActive ? tabActive : tabInactive}`
            }
          >
            Login
          </NavLink>
          <NavLink
            to="/auth/register"
            className={({ isActive }: NavLinkRenderProps) =>
              `${tabBase} ${isActive ? tabActive : tabInactive}`
            }
          >
            Register
          </NavLink>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
