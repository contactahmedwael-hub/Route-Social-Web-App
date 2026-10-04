import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * A link to a user's profile. If the user has no usable profile path (see
 * getProfilePath, which returns "#" when the user has no id) it renders as
 * plain text instead of a dead link that does nothing when clicked.
 */
export default function UserLink({
  to,
  className = "",
  title,
  children,
}: {
  to: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  if (!to || to === "#") return <span className={className}>{children}</span>;
  return (
    <Link to={to} className={className} title={title}>
      {children}
    </Link>
  );
}