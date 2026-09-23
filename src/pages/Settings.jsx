import Breadcrumbs from "../components/Breadcrumbs";
import ClaudeKeyCard from "../components/ClaudeKeyCard";
import SupabaseCard from "../components/SupabaseCard";
import AdvancedSettings from "../components/AdvancedSettings";

export default function Settings() {
  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: "דשבורד", href: "/" }, { label: "הגדרות" }]} />
      <h1 className="text-3xl font-black font-frank text-foreground mb-6">הגדרות</h1>

      <div className="space-y-5">
        <ClaudeKeyCard />
        <SupabaseCard />
        <AdvancedSettings />
      </div>

      <p className="text-xs text-muted-foreground mt-8 text-center">
        גרסה {__BUILD_ID__}
      </p>
    </div>
  );
}
