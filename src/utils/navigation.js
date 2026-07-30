/* React Router's navigate() is normally only available via the useNavigate() hook
   inside a component. Sheets are opened from plain functions (e.g. clicking a
   Home quick-action), so we stash a reference to the current navigate() function
   here once, from a tiny hook mounted at the top of <App/>, and any module can
   import { goTo } to navigate without needing to be a component itself. */
let navigateRef = null;

export function registerNavigate(fn) {
  navigateRef = fn;
}
export function goTo(path) {
  if (navigateRef) navigateRef(path);
  else window.location.assign(path); // fallback, shouldn't normally happen
}
