import PostHog from 'posthog-react-native';

export const posthog = new PostHog('phc_N0H3zV5Q8Z8v8z9m5V5X8z8v8z9m5V5X8z8v8z9m', {
  host: 'https://app.posthog.com',
});

export const trackEvent = (event: string, properties?: Record<string, any>) => {
  posthog.capture(event, properties);
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  posthog.identify(userId, properties);
};
