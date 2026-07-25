import { APP_NAME } from "./app.ts";

export const RESEND_FROM_ADDRESS = "onboarding@resend.dev";

export const RESEND_API_URL = "https://api.resend.com/emails";
export const RESEND_FROM_ALERTS = `${APP_NAME} Alerts <${RESEND_FROM_ADDRESS}>`;
export const RESEND_FROM_DEFAULT = `${APP_NAME} <${RESEND_FROM_ADDRESS}>`;
