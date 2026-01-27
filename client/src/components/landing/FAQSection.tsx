import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What industries does Arclo support?",
    answer: "Arclo is built specifically for local service businesses—plumbing, HVAC, electrical, landscaping, cleaning, roofing, and more. If you serve customers in a geographic area, Arclo is designed for you."
  },
  {
    question: "Can I edit the site myself?",
    answer: "Yes, you have full access to your website. You can make changes anytime. Major structural changes are reviewed before going live to ensure they don't negatively impact your SEO."
  },
  {
    question: "How long does setup take?",
    answer: "Under 60 seconds to generate your initial site. Full optimization happens over the first 2 weeks as our AI agents analyze your market and continuously improve your rankings."
  },
  {
    question: "What does 'autonomous SEO' mean?",
    answer: "Arclo continuously monitors, analyzes, and improves your site's SEO without manual intervention. Our AI agents work 24/7 to identify opportunities, fix issues, and keep your site ranking well."
  },
  {
    question: "Is there a free trial?",
    answer: "You can generate and preview your site completely free. Publishing your site and activating ongoing optimization requires a subscription."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, cancel anytime with no long-term contracts. We believe in earning your business every month, not locking you in."
  }
];

function FAQSchema() {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

export function FAQSection() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-card">
      <FAQSchema />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center mb-8 sm:mb-12">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-border">
              <AccordionTrigger className="text-left text-sm sm:text-base text-foreground font-medium hover:no-underline hover:text-foreground/80">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
