import { useState } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SEOHead } from "@/components/marketing/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Send, CheckCircle2, Mail, Building2, Phone } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const contactMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; company?: string; phone?: string; message: string }) => {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to submit");
      }
      return result;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Message sent! We'll be in touch soon.");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    contactMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      company: company.trim() || undefined,
      phone: phone.trim() || undefined,
      message: message.trim(),
    });
  };

  return (
    <MarketingLayout>
      <SEOHead
        path="/contact"
        title="Contact Sales – Arclo"
        description="Get in touch with our team to discuss enterprise SEO solutions, custom integrations, and tailored plans for your organization."
      />
      <div
        className="min-h-screen"
        style={{
          background: `
            radial-gradient(1200px circle at 10% 0%, rgba(139, 92, 246, 0.06), transparent 40%),
            radial-gradient(1200px circle at 90% 10%, rgba(236, 72, 153, 0.04), transparent 40%),
            radial-gradient(800px circle at 50% 80%, rgba(245, 158, 11, 0.03), transparent 40%),
            #FFFFFF
          `,
        }}
      >
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                Talk to Sales
              </h1>
              <p className="text-lg text-slate-600 max-w-xl mx-auto">
                Tell us about your needs and we'll get back to you within one business day.
              </p>
            </div>

            {submitted ? (
              <Card className="bg-white border border-emerald-200 shadow-sm rounded-2xl">
                <CardContent className="py-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Message received</h2>
                  <p className="text-slate-600 max-w-md mx-auto">
                    Thanks for reaching out. A member of our team will be in touch soon.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-900">Send us a message</CardTitle>
                  <CardDescription className="text-slate-500">
                    Fields marked with * are required.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-slate-700">Name *</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={contactMutation.isPending}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={contactMutation.isPending}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-slate-700">Company</Label>
                        <Input
                          id="company"
                          type="text"
                          placeholder="Your company"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          disabled={contactMutation.isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-slate-700">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={contactMutation.isPending}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-slate-700">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us about your SEO needs, number of websites, or any questions you have..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={contactMutation.isPending}
                        rows={5}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primaryGradient"
                      className="w-full h-12"
                      disabled={contactMutation.isPending}
                    >
                      {contactMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-sm text-slate-500 mb-3">You can also reach us at:</p>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href="mailto:hello@arclo.io" className="hover:text-violet-600 transition-colors">
                        hello@arclo.io
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
