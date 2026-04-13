// src/hooks/useDebounce.js
// Shared debounce utility. Not a React hook — exported from hooks/ by convention
// since it's primarily used alongside hooks and custom hook files.

/**
 * Returns a debounced version of fn that delays invocation by ms milliseconds.
 * Each call resets the timer.
 */
export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
