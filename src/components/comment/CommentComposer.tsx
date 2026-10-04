import { useRef, useState } from "react";
import { FiImage, FiSend, FiX } from "react-icons/fi";
import Avatar from "../ui/Avatar";
import ExpandableImage from "../ui/ExpandableImage";
import { useAuth } from "../../context/AuthContext";
import { getUserAvatar, getUserName } from "../../utils/postHelpers";

interface CommentComposerProps {
  placeholder?: string;
  onSubmit: (content: string, image: File | null) => Promise<void>;
  autoFocus?: boolean;
}

export default function CommentComposer({
  placeholder = "Write a comment…",
  onSubmit,
  autoFocus = false,
}: CommentComposerProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if ((!text.trim() && !image) || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim(), image);
      setText("");
      clearImage();
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-start gap-2">
      <Avatar src={getUserAvatar(user)} name={getUserName(user)} size="sm" />
      <div className="flex-1">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-1.5 py-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-gray-600 p-1.5"
            title="Attach a photo"
          >
            <FiImage />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={(!text.trim() && !image) || submitting}
            className="bg-rp-navy disabled:bg-rp-navy/40 text-white rounded-full p-1.5"
            title="Send"
          >
            <FiSend className="text-xs" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />

        {imagePreview && (
          <div className="relative inline-block mt-2">
            <ExpandableImage
              src={imagePreview}
              alt="Attachment preview"
              className="max-h-32 rounded-lg border border-gray-200 object-cover"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
            >
              <FiX className="text-xs" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}