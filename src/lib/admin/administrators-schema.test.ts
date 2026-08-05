import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelAdministratorInvitationSchema,
  inviteAdministratorSchema,
  revokeAdministratorSchema,
} from "./administrators-schema.ts";

test("administrator invitations normalize email and optional name", () => {
  const parsed = inviteAdministratorSchema.parse({
    displayName: "  Ana Popescu  ",
    email: "  ANA@Example.COM ",
    reason: "Acces pentru coordonarea evenimentelor.",
  });

  assert.equal(parsed.displayName, "Ana Popescu");
  assert.equal(parsed.email, "ana@example.com");
});

test("sensitive administrator mutations reject short reasons and extra keys", () => {
  assert.equal(
    revokeAdministratorSchema.safeParse({
      confirmationEmail: "admin@example.com",
      reason: "scurt",
      targetUserId: "78a26440-f76c-4ff3-8b64-c636adddcfe0",
    }).success,
    false,
  );

  assert.equal(
    cancelAdministratorInvitationSchema.safeParse({
      invitationId: "78a26440-f76c-4ff3-8b64-c636adddcfe0",
      reason: "Invitația a fost creată pentru adresa greșită.",
      role: "super-admin",
    }).success,
    false,
  );
});
