import type { Moment } from "./api";

const photos = [
  {
    "image_path": "/demo/moment-01.webp",
    "comment": "The sky had other plans tonight."
  },
  {
    "image_path": "/demo/moment-02.webp",
    "comment": "A seat in the stands. Nowhere else to be."
  },
  {
    "image_path": "/demo/moment-03.webp",
    "comment": "Lunch deserved its own photo."
  },
  {
    "image_path": "/demo/moment-04.webp",
    "comment": "The city, still wide awake."
  },
  {
    "image_path": "/demo/moment-05.webp",
    "comment": "A little time by the water."
  },
  {
    "image_path": "/demo/moment-06.webp",
    "comment": "One last look before the curtain falls."
  },
  {
    "image_path": "/demo/moment-07.webp",
    "comment": "Looking up on the way through."
  },
  {
    "image_path": "/demo/moment-08.webp",
    "comment": "A small thing that made me smile."
  },
  {
    "image_path": "/demo/moment-09.webp",
    "comment": "Blue skies and a better view."
  },
  {
    "image_path": "/demo/moment-10.webp",
    "comment": "A closer look at the little details."
  },
  {
    "image_path": "/demo/moment-11.webp",
    "comment": "A pause outside, before moving on."
  },
  {
    "image_path": "/demo/moment-12.webp",
    "comment": "Working it out, one line at a time."
  }
];

export const demoMoments: Moment[] = photos.map((photo, i) => ({
  ...photo,
  id: i + 1,
  is_starred: [0, 3, 5, 8].includes(i),
  created_at: Math.floor(new Date(2026, 8, 22 - i * 3, 12).getTime() / 1000),
}));
