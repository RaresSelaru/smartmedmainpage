import { NewContentForm } from "@/components/admin/new-content-form";
import { requireAdminCapability } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewAdminContentPage() {
  await requireAdminCapability("content.create", {
    nextPath: "/admin/content/new",
  });

  return <NewContentForm />;
}
