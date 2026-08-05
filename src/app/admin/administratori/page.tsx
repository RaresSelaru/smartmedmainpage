import { AdministratorsDashboard } from "@/components/admin/administrators-dashboard";
import { getAdministratorsOverview } from "@/lib/admin/administrators-repository";
import { requireAdminCapability } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAdministratorsPage() {
  await requireAdminCapability("administrators.read", {
    nextPath: "/admin/administratori",
  });
  const overview = await getAdministratorsOverview();

  return (
    <AdministratorsDashboard
      administrators={overview.data.administrators}
      error={overview.error}
      invitations={overview.data.invitations}
    />
  );
}
