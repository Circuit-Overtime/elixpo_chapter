export const runtime = "edge";

import TemplateComposer from "../../../components/template-composer";
import { requireDashboardSession } from "@/lib/dashboard-session";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardSession();
    const { id } = await params;
    return <TemplateComposer templateId={id} />;
}
