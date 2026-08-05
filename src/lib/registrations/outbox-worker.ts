import "server-only";

import { dispatchCenterEnrollmentNotifications } from "@/lib/center-enrollments/notifications";
import { dispatchEventRegistrationNotifications } from "@/lib/events/notifications";
import {
  parseRegistrationNotificationRetryTargets,
  runRegistrationNotificationWorkerBatch,
} from "@/lib/registrations/outbox-worker-core";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const retryBatchSize = 12;
const deliveryConcurrency = 3;

export async function processRegistrationNotificationOutbox() {
  const service = createSupabaseServiceClient();
  if (!service) {
    throw new Error("REGISTRATION_NOTIFICATION_WORKER_NOT_CONFIGURED");
  }

  const response = await service.rpc(
    "list_registration_notification_retry_targets",
    { p_limit: retryBatchSize },
  );
  if (response.error) {
    console.error("SmartMed registration notification worker query failed", {
      code: response.error.code,
    });
    throw new Error("REGISTRATION_NOTIFICATION_WORKER_QUERY_FAILED");
  }

  let targets;
  try {
    targets = parseRegistrationNotificationRetryTargets(response.data);
  } catch {
    console.error("SmartMed registration notification worker response was invalid");
    throw new Error("REGISTRATION_NOTIFICATION_WORKER_INVALID_RESPONSE");
  }

  return runRegistrationNotificationWorkerBatch({
    concurrency: deliveryConcurrency,
    dispatchers: {
      dispatchCenter: dispatchCenterEnrollmentNotifications,
      dispatchEvent: dispatchEventRegistrationNotifications,
    },
    targets,
  });
}
