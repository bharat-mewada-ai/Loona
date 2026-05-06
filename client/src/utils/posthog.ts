// PostHog analytics have been disabled to stabilize the build.
// These dummy functions ensure no imports break.

export const posthog = {};
export const captureEvent = (event: string, properties?: any) => {};
export const identifyUser = (userId: string, properties?: any) => {};
