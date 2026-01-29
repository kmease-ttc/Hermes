import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Privacy() {
  return (
    <MarketingLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-4 lg:p-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-privacy-title">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: January 2026</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>We collect information you provide directly to us, such as:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Account information (name, email, password)</li>
              <li>Website URLs and configurations you add to the platform</li>
              <li>API keys and credentials for third-party integrations</li>
              <li>Usage data and preferences</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Monitor and analyze your websites' SEO performance</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Develop new features and services</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Data Security</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              We take reasonable measures to help protect your personal information from loss, theft, 
              misuse, unauthorized access, disclosure, alteration, and destruction. All API keys and 
              sensitive credentials are encrypted at rest.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              We retain your information for as long as your account is active or as needed to provide 
              you services. You can request deletion of your data at any time by contacting support.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Service integrates with third-party services like Google Analytics, Google Search 
              Console, and Google Ads. Your use of these integrations is subject to the respective 
              third-party privacy policies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              If you have any questions about this Privacy Policy, please contact us at privacy@arclo.io.
            </p>
          </CardContent>
        </Card>

        <Separator className="my-8" />
        
        <p className="text-sm text-muted-foreground text-center pb-8">
          By using Arclo, you acknowledge that you have read and understood this Privacy Policy.
        </p>
      </div>
    </MarketingLayout>
  );
}
