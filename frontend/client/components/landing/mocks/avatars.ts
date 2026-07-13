/* ------------------------------------------------------------------ */
/*  Shared profile-picture stack for all dashboard mocks. Every place  */
/*  a user avatar shows up (feed authors, live-room chat, the logged-  */
/*  in user's own header/composer avatar) pulls from this same set so  */
/*  the mocks feel like one consistent, lived-in product rather than   */
/*  each screen inventing its own placeholder art.                     */
/* ------------------------------------------------------------------ */

export const AVATARS = {
  pikachu: "/avatars/pikachu.png",
  squirtle: "/avatars/squirtle.png",
  charmander: "/avatars/charmander.png",
  chikorita: "/avatars/chikorita.png",
  psyduck: "/avatars/psyduck.png",
  wobbuffet: "/avatars/wobbuffet.png",
} as const;

export type AvatarKey = keyof typeof AVATARS;

/* Named cast used across the mocks — keep names/avatars paired here so
   every screen referencing "sruthi" etc. stays in sync. */
export const USERS = {
  sruthi: { name: "Sruthi", avatar: AVATARS.pikachu },
  rohan: { name: "Rohan", avatar: AVATARS.squirtle },
  parinith: { name: "Parinith", avatar: AVATARS.charmander },
  piyush: { name: "Piyush", avatar: AVATARS.chikorita },
  // spare avatars kept in the stack for the logged-in user chrome
  // (header avatar, composer avatar) and any future mock screens
  self: { name: "You", avatar: AVATARS.psyduck },
  guest: { name: "Guest", avatar: AVATARS.wobbuffet },
} as const;
