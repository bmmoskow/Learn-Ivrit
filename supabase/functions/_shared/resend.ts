import { APP_NAME } from "./app.ts";

export const RESEND_API_URL = "https://api.resend.com/emails";

// One "From" header per email purpose. Values may coincide (automated mail
// sends from no-reply@), but each purpose keeps its own constant so changing
// one sender can never silently affect another.
export const RESEND_FROM_ALERTS = `${APP_NAME} Alerts <no-reply@learn-ivrit.com>`;
export const RESEND_FROM_CONTACT = `${APP_NAME} <contact@learn-ivrit.com>`;
