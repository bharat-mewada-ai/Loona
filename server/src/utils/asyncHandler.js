/**
 * Async Handler Wrapper
 * Catches errors in async route handlers and passes them to the error middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
