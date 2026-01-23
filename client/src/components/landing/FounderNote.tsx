import { Quote } from "lucide-react";

export function FounderNote() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <div 
          className="rounded-2xl p-8 md:p-10 relative"
          style={{
            background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.06)"
          }}
        >
          <div className="absolute -top-4 left-8">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-pink-500 to-gold flex items-center justify-center">
              <Quote className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <div className="pt-2">
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              "We built Arclo after getting burned by agencies and overwhelmed by tools. 
              For years, we paid monthly retainers with little visibility into what was actually being done. 
              Reports were confusing. Results were inconsistent. And we were always waiting on someone else."
            </p>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              "So we built what we wished existed: a system that handles SEO automatically, 
              shows you exactly what it's doing, and actually improves over time — without meetings, 
              without reports to review, and without depending on an agency's availability."
            </p>
            
            <p className="text-muted-foreground mb-6">
              Arclo started as an internal tool for a real medical practice. It replaced two agencies, 
              increased organic leads by 40%, and freed up hours every week. Now we're making it 
              available to every local business.
            </p>
            
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <div className="w-12 h-12 rounded-full bg-brand-soft border border-border flex items-center justify-center">
                <span className="text-lg font-bold text-brand">A</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">The Arclo Team</p>
                <p className="text-sm text-muted-foreground">Built by operators, for operators</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
