import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Breadcrumbs from "../components/Breadcrumbs";
import PersonaCard from "../components/PersonaCard";
import EmptyState from "../components/EmptyState";

function QuickAction({ to, title, description }) {
  return (
    <Link to={to}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="p-5 rounded-xl border border-border/50 bg-card hover:border-accent/50 
                   hover:shadow-md transition-all duration-200 cursor-pointer"
      >
        <h3 className="text-lg font-bold font-frank text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </motion.div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: personas = [], isLoading } = useQuery({
    queryKey: ["personas"],
    queryFn: () => base44.entities.Persona.list("-updated_date"),
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "דשבורד" }]} />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Persona Grid - Left 60% */}
        <div className="flex-1 lg:w-[60%]">
          <h2 className="text-3xl font-black font-frank text-foreground mb-6">
            כל המומחים שלי
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : personas.length === 0 ? (
            <EmptyState
              title="עדיין אין מומחים"
              description="צור את המומחה הראשון שלך — תבחר לו שם, תחום, וטון דיבור, והוא יהיה מוכן לשיחה."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personas.map((persona, i) => (
                <PersonaCard key={persona.id} persona={persona} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions - Right 40% */}
        <div className="lg:w-[40%]">
          <h2 className="text-xl font-bold font-frank text-foreground mb-4">
            פעולות מהירות
          </h2>
          <div className="space-y-3">
            <QuickAction
              to={personas.length > 0 ? `/chat/${personas[0].id}` : "/persona/new"}
              title="שיחה חדשה"
              description={
                personas.length > 0
                  ? "פתח שיחה עם אחד מהמומחים שיצרת"
                  : "צור מומחה כדי להתחיל שיחה"
              }
            />
            <QuickAction
              to="/persona/new"
              title="מומחה חדש"
              description="בנה מומחה חדש עם אישיות ייחודית, תחום מומחיות וטון דיבור"
            />
            <QuickAction
              to="/confrontation"
              title="עימות מומחים"
              description="בחר מספר מומחים, שאל שאלה אחת וצפה בתשובות שונות זו לצד זו"
            />
          </div>

          {personas.length > 0 && (
            <div className="mt-8 p-5 rounded-xl bg-secondary/50 border border-border/30">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground text-2xl font-frank block mb-1">
                  {personas.length}
                </span>
                מומחים נוצרו עד כה
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}