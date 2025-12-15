// TODO: Create a shared package in the monorepo for these constants
export const URLS = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - VITE_API_BASE_URL is defined by us with Vite naming convention
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string) || "localhost:1926",
} as const;

export const META = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - MODE is set by the Vite environment
  DEV_MODE: import.meta.env.MODE === "development",
};

export const BACKEND_URLS = {
  BASE: `https://${URLS.API_BASE_URL}`,
  AUTHENTICATE_APP: `https://${URLS.API_BASE_URL}/api/auth/authenticate-app`,
  INVITATION_DETAILS: (uuid: string) => `https://${URLS.API_BASE_URL}/api/invitation-details/${uuid}`,
} as const;
