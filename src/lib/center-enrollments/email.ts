import "server-only";

import {
  createCenterEnrollmentNotificationSender,
  type CenterEnrollmentNotificationInput,
} from "@/lib/center-enrollments/email-core";

export async function sendCenterEnrollmentNotification(
  input: CenterEnrollmentNotificationInput,
) {
  const sender = createCenterEnrollmentNotificationSender({
    environment: {
      CENTER_ENROLLMENT_STAFF_EMAIL:
        process.env.CENTER_ENROLLMENT_STAFF_EMAIL,
      REGISTRATIONS_STAFF_EMAIL: process.env.REGISTRATIONS_STAFF_EMAIL,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      RESEND_REPLY_TO_EMAIL: process.env.RESEND_REPLY_TO_EMAIL,
    },
    fetchImpl: globalThis.fetch,
  });

  return sender(input);
}
