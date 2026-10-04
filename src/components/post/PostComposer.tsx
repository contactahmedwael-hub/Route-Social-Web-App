import { useRef, useState } from "react";
import { FiImage, FiSmile, FiSend, FiChevronDown, FiX } from "react-icons/fi";
import Avatar from "../ui/Avatar";
import ExpandableImage from "../ui/ExpandableImage";
import EmojiPicker from "./EmojiPicker";
import { useAuth } from "../../context/AuthContext";
import { createPost } from "../../api/postService";
import { extractPost } from "../../utils/postResponse";
import { getUserAvatar, getUserName } from "../../utils/postHelpers";
import type { Post } from "../../types";

interface PostComposerProps {
  onPostCreated?: (post: Post) => void;
}

export default function PostComposer({ onPostCreated }: PostComposerProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const name = getUserName(user);
  const firstName = name?.split(" ")[0] || "there";
  const avatar = getUserAvatar(user);

  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    // Reset so choosing the same file again still fires onChange.
    e.target.value = "";
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
  };

  // Puts the emoji into the text where the cursor is (replacing any selected
  // text), then puts the cursor right after it so typing can carry on.
  const handleEmojiSelect = (emoji: string) => {
    const input = textareaRef.current;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));

    const caret = start + emoji.length;
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(caret, caret);
    });
  };

  const resetComposer = () => {
    setText("");
    clearImage();
  };

  // Text is only required when there's no image. With an image attached, the
  // body can be empty.
  const hasContent = Boolean(text.trim() || image);

  const handlePost = async () => {
    if (!hasContent || posting) return;
    setError("");
    setPosting(true);
    try {
      const body = text.trim();

      const formData = new FormData();
      // Skip the body field entirely for image-only posts instead of sending "".
      if (body) formData.append("body", body);
      if (image) formData.append("image", image);

      const { data } = await createPost(formData);
      const newPost = extractPost(data);

      if (newPost) {
        onPostCreated?.(newPost);
      } else {
        console.error("Post created but no post object was found in:", data);
      }
      resetComposer();
    } catch (err: any) {
      console.error("Create post failed:", err);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Couldn't publish that post. Please try again."
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar src={avatar} name={name} />
        <div>
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 mt-0.5 hover:bg-gray-200"
          >
            🌐 Public <FiChevronDown className="text-[10px]" />
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`What's on your mind, ${firstName}?`}
        rows={3}
        className="w-full resize-none bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy"
      />

      {imagePreview && (
        <div className="relative mt-3 inline-block">
          <ExpandableImage
            src={imagePreview}
            alt="Selected upload preview"
            className="max-h-64 rounded-lg border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
            title="Remove photo"
          >
            <FiX />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />

      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <button
            type="button"
            onClick={handleImageClick}
            className="flex items-center gap-1.5 hover:text-gray-700"
          >
            <FiImage className="text-green-600" /> Photo/video
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="flex items-center gap-1.5 hover:text-gray-700"
            >
              <FiSmile className="text-amber-500" /> Emoji
            </button>
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handlePost}
          disabled={!hasContent || posting}
          className="flex items-center gap-1.5 bg-rp-navy disabled:bg-rp-navy/50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-4 py-2"
        >
          {posting ? "Posting…" : "Post"} <FiSend className="text-xs" />
        </button>
      </div>
    </div>
  );
}