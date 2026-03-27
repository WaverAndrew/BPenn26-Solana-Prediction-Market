"use client";

const CATEGORIES = [
  { id: undefined, label: "All" },
  { id: 0, label: "Politics" },
  { id: 1, label: "Crypto" },
  { id: 2, label: "Sports" },
  { id: 3, label: "Science" },
  { id: 4, label: "Culture" },
  { id: 5, label: "Economics" },
  { id: 6, label: "Technology" },
  { id: 7, label: "Other" },
];

export const CATEGORY_LABELS: Record<number, string> = {
  0: "Politics",
  1: "Crypto",
  2: "Sports",
  3: "Science",
  4: "Culture",
  5: "Economics",
  6: "Technology",
  7: "Other",
};

interface CategoryFilterProps {
  selected: number | undefined;
  onChange: (category: number | undefined) => void;
}

export default function CategoryFilter({
  selected,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.label}
            onClick={() => onChange(cat.id)}
            className={`
              whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all
              ${
                isActive
                  ? "bg-accent-blue text-white shadow-glow"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }
            `}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
