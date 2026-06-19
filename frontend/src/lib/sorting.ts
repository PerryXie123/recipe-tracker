export type LibrarySort =
  | "name-asc"
  | "name-desc"
  | "created-desc"
  | "created-asc"
  | "protein-asc"
  | "protein-desc"
  | "calories-asc"
  | "calories-desc";

export const librarySortOptions: Array<{ value: LibrarySort; label: string }> = [
  { value: "name-asc", label: "Alphabetical (A–Z)" },
  { value: "name-desc", label: "Alphabetical (Z–A)" },
  { value: "created-desc", label: "Date created (newest)" },
  { value: "created-asc", label: "Date created (oldest)" },
  { value: "protein-asc", label: "Protein (low to high)" },
  { value: "protein-desc", label: "Protein (high to low)" },
  { value: "calories-asc", label: "Calories (low to high)" },
  { value: "calories-desc", label: "Calories (high to low)" }
];

export function sortLibraryItems<T>(
  items: T[],
  sort: LibrarySort,
  values: {
    name: (item: T) => string;
    createdAt: (item: T) => string | null | undefined;
    protein: (item: T) => number;
    calories: (item: T) => number;
  }
) {
  const direction = sort.endsWith("-desc") ? -1 : 1;
  const nameCompare = (first: T, second: T) =>
    values.name(first).localeCompare(values.name(second), undefined, { numeric: true, sensitivity: "base" });

  return [...items].sort((first, second) => {
    let comparison = 0;

    if (sort.startsWith("name")) {
      comparison = nameCompare(first, second);
    } else if (sort.startsWith("created")) {
      comparison = getTimestamp(values.createdAt(first)) - getTimestamp(values.createdAt(second));
    } else if (sort.startsWith("protein")) {
      comparison = values.protein(first) - values.protein(second);
    } else {
      comparison = values.calories(first) - values.calories(second);
    }

    return comparison === 0 ? nameCompare(first, second) : comparison * direction;
  });
}

function getTimestamp(value: string | null | undefined) {
  const timestamp = value ? Date.parse(value) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}
