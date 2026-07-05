// Fires `onEnter` once, the first time `el` scrolls into the viewport.
// Used so sections (like Highlights) don't fetch their JSON until the
// user actually scrolls near them.
function onceInView(el, onEnter, options = { rootMargin: "150px" }) {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        obs.disconnect();
        onEnter();
      }
    });
  }, options);
  observer.observe(el);
  return observer;
}

// Fires `onEnter` every time `el` scrolls into view (used for infinite-scroll
// "load more" sentinels). Caller is responsible for disconnecting when done.
function whileInView(el, onEnter, options = { rootMargin: "200px" }) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) onEnter();
    });
  }, options);
  observer.observe(el);
  return observer;
}
