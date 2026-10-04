import { getInitials } from "../../utils/postHelpers";
import ExpandableImage from "./ExpandableImage";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
  expandable?: boolean;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-24 h-24 text-2xl",
};

export default function Avatar({
  src,
  name,
  size = "md",
  className = "",
  expandable = false,
}: AvatarProps) {
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (src) {
    const Img = expandable ? ExpandableImage : "img";
    return (
      <Img
        src={src}
        alt={name || "avatar"}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-rp-navy/10 text-rp-navy font-semibold flex items-center justify-center shrink-0 ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}