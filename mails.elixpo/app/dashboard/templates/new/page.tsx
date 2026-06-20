export const runtime = "edge";

import TemplateComposer from "../../../components/template-composer";
import { requireDashboardSession } from "@/lib/dashboard-session";

export default async function NewTemplatePage() {
    await requireDashboardSession();
    return <TemplateComposer />;
}
