import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { EMOJI_CATEGORIES } from "../../utils/emojiData";

interface EmojiPickerProps {
  /** Called with the chosen emoji character, e.g. "😍". */
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const RECENT_KEY = "rp_recent_emojis";
const RECENT_MAX = 24;

function loadRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((e: unknown): e is string => typeof e === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Emoji picker with every category, a search box and a "recently used" tab.
 * It has no dependencies: the emoji come from src/utils/emojiData.ts.
 * Closes when you click outside it or press Escape.
 */
export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [active, setActive] = useState<string>(() => (loadRecent().length ? "recent" : "smileys"));
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  // Back to the top of the list whenever the tab or the search changes.
  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0 });
  }, [active, query]);

  const term = query.trim().toLowerCase();

  const shown = useMemo(() => {
    if (term) {
      const matches: [string, string][] = [];
      for (const category of EMOJI_CATEGORIES) {
        for (const entry of category.emojis) {
          if (entry[1].includes(term) || entry[0] === query.trim()) matches.push(entry);
        }
      }
      return { title: `Results for "${query.trim()}"`, emojis: matches };
    }
    if (active === "recent") {
      return { title: "Recently used", emojis: recent.map((e: string): [string, string] => [e, ""]) };
    }
    const category = EMOJI_CATEGORIES.find((c) => c.id === active) ?? EMOJI_CATEGORIES[0];
    return { title: category.label, emojis: category.emojis };
  }, [term, query, active, recent]);

  const handlePick = (emoji: string) => {
    onSelect(emoji);
    const next = [emoji, ...recent.filter((e: string) => e !== emoji)].slice(0, RECENT_MAX);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — recents just won't be remembered
    }
  };

  const tabClass = (isActive: boolean) =>
    `shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-lg leading-none transition-colors ${
      isActive && !term ? "bg-gray-100" : "hover:bg-gray-50"
    }`;

  return (
    <div
      ref={ref}
      className="absolute z-20 mt-2 left-0 w-[min(340px,85vw)] bg-white border border-gray-200 rounded-xl shadow-lg"
    >
      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy"
          />
        </div>
      </div>

      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100 overflow-x-auto">
        {recent.length > 0 && (
          <button
            type="button"
            title="Recently used"
            onClick={() => {
              setQuery("");
              setActive("recent");
            }}
            className={tabClass(active === "recent")}
          >
            🕘
          </button>
        )}
        {EMOJI_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            title={category.label}
            onClick={() => {
              setQuery("");
              setActive(category.id);
            }}
            className={tabClass(active === category.id)}
          >
            {category.icon}
          </button>
        ))}
      </div>

      <div ref={gridRef} className="h-64 overflow-y-auto p-2">
        <p className="text-xs font-semibold text-gray-500 mb-1.5">{shown.title}</p>
        {shown.emojis.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No emoji found.</p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {shown.emojis.map(([emoji, name]: [string, string], i: number) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                title={name}
                onClick={() => handlePick(emoji)}
                className="flex items-center justify-center rounded-lg p-1 text-2xl leading-none hover:bg-gray-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}