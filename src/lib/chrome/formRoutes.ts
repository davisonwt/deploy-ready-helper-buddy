/**
 * Routes where the page's own controls own the screen.
 *
 * The app mounts several dismissible nag cards at the App root, each one
 * `fixed` in the bottom-right corner. On a page of prose that is harmless.
 * On a form it is not: measured on production, the Enable Notifications
 * card covered "Electrician" and "Builder" on /sow/hand at 1280x720 and
 * three household choices at 390x844, and the Enable sound pill covered
 * two more. A member cannot pick what a card is sitting on.
 *
 * Each banner used to carry its own ad-hoc exclusion list, which is why
 * the same bug keeps arriving one surface at a time -- the stall interior
 * got a fix, the sow forms did not. One shared predicate instead.
 */
const SUPPRESSED_ROUTES: RegExp[] = [
  /^\/sow(\/|$)/,
  /^\/register-wandering(\/|$)/,
  // Not a form, the same collision: measured on production, the card sat on
  // "Silver Hyundai Venue" and its Edit and Make unavailable buttons, and
  // the sound pill sat on Delete. This is where a member manages what they
  // have listed, so every control on it has to be reachable.
  /^\/my-listings(\/|$)/,
  // A member reading a listing should not have a nag card over it. The
  // Enable Notifications card sat on top of the seed detail pages, which are
  // where someone decides whether to book.
  /^\/seed\/(wheel|pillow|hand)\//,
];

export function isOverlaySuppressedRoute(pathname: string): boolean {
  return SUPPRESSED_ROUTES.some((re) => re.test(pathname));
}
