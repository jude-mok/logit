import type { Moment } from "./api";
const photos = [
  "photo-1441974231531-c6227db76b6e",
  "photo-1442512595331-e89e73853f31",
  "photo-1470770841072-f978cf4d019e",
  "photo-1476514525535-07fb3b4ae5f1",
  "photo-1470252649378-9c29740c9fa8",
  "photo-1500534623283-312aade485b7",
  "photo-1464822759023-fed622ff2c3b",
  "photo-1447752875215-b2761acb3c5d",
  "photo-1470071459604-3b5ec3a7fe05",
  "photo-1501785888041-af3ef285b470",
  "photo-1455390582262-044cdead277a",
  "photo-1518837695005-2083093ee35b",
];
const captions = [
  "Took the long way home. Worth it.",
  "A slow morning, just for me.",
  "Nothing on the agenda. Everything to remember.",
  "Somewhere I would like to stay a little longer.",
  "The light did its thing again.",
  "A little room to breathe.",
  "Small in the best possible way.",
  "Found a quieter kind of green.",
  "Before the rest of the world woke up.",
  "Collecting days like this.",
  "A few words before the day begins.",
  "Stayed until the sky changed.",
];
export const demoMoments: Moment[] = photos.map((photo, i) => ({
  id: i + 1,
  image_path: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=720&q=80`,
  comment: captions[i],
  is_starred: [0, 3, 5, 8].includes(i),
  created_at: Math.floor(new Date(2026, 8, 22 - i * 3, 12).getTime() / 1000),
}));
