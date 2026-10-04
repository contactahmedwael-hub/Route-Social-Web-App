import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { FiX } from "react-icons/fi";

interface ViewerImage {
  src: string;
  alt: string;
}

interface ImageViewerContextValue {
  openImage: (src: string, alt?: string) => void;
}

const ImageViewerContext = createContext<ImageViewerContextValue | null>(null);

export function ImageViewerProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<ViewerImage | null>(null);

  const openImage = useCallback((src: string, alt = "") => setImage({ src, alt }), []);
  const close = useCallback(() => setImage(null), []);

  // Escape closes the viewer, and the page behind it doesn't scroll while open.
  useEffect(() => {
    if (!image) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [image, close]);

  return (
    <ImageViewerContext.Provider value={{ openImage }}>
      {children}
      {image && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 bg-white/15 hover:bg-white/30 text-white rounded-full p-2"
            title="Close"
          >
            <FiX className="text-xl" />
          </button>
          <img
            src={image.src}
            alt={image.alt}
            className="max-w-full max-h-full object-contain rounded-lg cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </ImageViewerContext.Provider>
  );
}

export function useImageViewer(): ImageViewerContextValue {
  const ctx = useContext(ImageViewerContext);
  if (!ctx) throw new Error("useImageViewer must be used within an ImageViewerProvider");
  return ctx;
}