import { PageShell } from "@/components/layout/PageShell";
import { pageScaffolds, type PageKey } from "@/lib/site-config";

type StandardPageProps = {
  pageKey: PageKey;
};

export function StandardPage({ pageKey }: StandardPageProps) {
  return <PageShell page={pageScaffolds[pageKey]} />;
}
