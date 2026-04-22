export const JOB_SOURCES = [
  "LinkedIn",
  "Glassdoor",
  "Dice",
  "JobRight",
  "Simplify",
  "Other",
] as const;

export type JobSource = (typeof JOB_SOURCES)[number];
