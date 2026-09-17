/**
 * Routes where a full-page form owns the screen.
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
const FORM_ROUTES: RegExp[] = [
  /^\/sow(\/|$)/,
  /^\/register-wandering(\/|$)/,
];

export function isFullPageFormRoute(pathname: string): boolean {
  return FORM_ROUTES.some((re) => re.test(pathname));
}
