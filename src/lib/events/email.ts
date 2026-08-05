import "server-only";

import {
  createEventRegistrationNotificationSender,
  type EventRegistrationNotificationInput,
} from "@/lib/events/email-core";

export async function sendEventRegistrationNotification(
  input: EventRegistrationNotificationInput,
) {
  return createEventRegistrationNotificationSender({
    environment: {
      REGISTRATIONS_STAFF_EMAIL: process.env.REGISTRATIONS_STAFF_EMAIL,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      RESEND_REPLY_TO_EMAIL: process.env.RESEND_REPLY_TO_EMAIL,
    },
    fetchImpl: globalThis.fetch,
  })(input);
}
