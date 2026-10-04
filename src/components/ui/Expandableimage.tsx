import type { ImgHTMLAttributes } from "react";
import { useImageViewer } from "./ImageViewer";

// A normal <img> that opens full-size in the image viewer when clicked.
export default function ExpandableImage({
  className = "",
  onClick,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const { openImage } = useImageViewer();

  return (
    <img
      {...props}
      className={`cursor-zoom-in ${className}`}
      onClick={(e) => {
        onClick?.(e);
        if (props.src) openImage(props.src, props.alt);
      }}
    />
  );
}