import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Terms() {
  return (
    <MarketingLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-4 lg:p-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-terms-title">Terms and Conditions</h1>
          <p className="text-muted-foreground mt-2">Last updated: January 2026</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              By accessing and using Arclo ("the Service"), you accept and agree to be bound by the terms 
              and provisions of this agreement. If you do not agree to abide by these terms, please do not 
              use this Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              Arclo provides SEO monitoring, analytics, and optimization tools for websites. The Service 
              includes but is not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Website performance monitoring and diagnostics</li>
              <li>Search engine ranking tracking</li>
              <li>Content analysis and recommendations</li>
              <li>Integration with third-party analytics platforms</li>
              <li>Automated SEO task management</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              To access certain features of the Service, you may be required to create an account. You are 
              responsible for maintaining the confidentiality of your account credentials and for all 
              activities that occur under your account.
            </p>
            <p className="mt-2">
              You agree to provide accurate, current, and complete information during the registration 
              process and to update such information to keep it accurate, current, and complete.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Data and Privacy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              Your use of the Service is also governed by our Privacy Policy. By using the Service, you 
              consent to the collection and use of information as described in our Privacy Policy.
            </p>
            <p className="mt-2">
              You retain ownership of all data you provide to the Service. We will not share your data 
              with third parties except as necessary to provide the Service or as required by law.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Acceptable Use</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Service and its original content, features, and functionality are owned by Arclo and are 
              protected by international copyright, trademark, patent, trade secret, and other intellectual 
              property laws.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              In no event shall Arclo, its directors, employees, partners, agents, suppliers, or affiliates 
              be liable for any indirect, incidental, special, consequential, or punitive damages, including 
              without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              We reserve the right to modify or replace these terms at any time. If a revision is material, 
              we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes 
              a material change will be determined at our sole discretion.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              If you have any questions about these Terms, please contact us at support@arclo.io.
            </p>
          </CardContent>
        </Card>

        <Separator className="my-8" />
        
        <p className="text-sm text-muted-foreground text-center pb-8">
          By using Arclo, you acknowledge that you have read, understood, and agree to be bound by these 
          Terms and Conditions.
        </p>
      </div>
    </MarketingLayout>
  );
}
