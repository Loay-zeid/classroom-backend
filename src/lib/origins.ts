const splitOrigins = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const trustedOrigins = Array.from(
  new Set(
    splitOrigins(process.env.FRONTEND_URLS).concat(splitOrigins(process.env.FRONTEND_URL))
  )
);

export const isAllowedOrigin = (origin?: string | null) => {
  if (!origin) return true;

  return trustedOrigins.includes(origin);
};
