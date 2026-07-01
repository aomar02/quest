// Constants shared by the review server action (validation) and the client
// modal/inputs. Kept free of any server-only imports so client components can
// use them directly.

// Ratings are out of 5 in half-star steps: 0.5, 1, 1.5, … 5.
export const RATING_MIN = 0.5;
export const RATING_MAX = 5;
export const RATING_STEP = 0.5;

// "Short review" cap. Comfortably under the DB CHECK (2000) so a valid client
// submission never trips a raw Postgres error.
export const REVIEW_BODY_MAX = 1000;

/** True when `value` is a valid half-star rating in [0.5, 5]. */
export function isValidRating(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= RATING_MIN &&
    value <= RATING_MAX &&
    value * 2 === Math.floor(value * 2)
  );
}
