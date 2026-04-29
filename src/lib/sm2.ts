/**
 * SM-2 spaced repetition algorithm.
 * quality: 0..5 (0 = blackout, 5 = perfect)
 * Returns updated state and next due date.
 */
export type SM2State = {
  ease: number;
  interval: number; // days
  repetitions: number;
  dueAt: Date;
};

export function sm2(state: SM2State, quality: number): SM2State {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { ease, interval, repetitions } = state;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease);
    repetitions += 1;
  }

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const dueAt = new Date();
  dueAt.setHours(0, 0, 0, 0);
  dueAt.setDate(dueAt.getDate() + interval);

  return { ease, interval, repetitions, dueAt };
}

/** Map UI button (Encore / Difficile / Bien / Facile) to SM-2 quality. */
export function ratingToQuality(rating: "again" | "hard" | "good" | "easy"): number {
  switch (rating) {
    case "again":
      return 1;
    case "hard":
      return 3;
    case "good":
      return 4;
    case "easy":
      return 5;
  }
}
