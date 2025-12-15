// @ts-ignore
export const URLS = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string,
  DEV_MODE: import.meta.env.MODE === "development",
} as const;

export const BOTTOM_ARROW = import.meta.env.VITE_BOTTOM_ARROW === "true";
export const DEBUGGING_VIDEO_TRACK = false;
export const OS = import.meta.env.VITE_OS as string;
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN_JS as string;
export const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY as string;
export const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string;

export const BACKEND_URLS = {
  BASE: `https://${URLS.API_BASE_URL}`,
  LOGIN_JWT: `https://${URLS.API_BASE_URL}/login-app`,
} as const;
