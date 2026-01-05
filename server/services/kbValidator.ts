import { db } from '../db';
import { kbRules, type KbRule, type Change } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface WebsiteContext {
  websiteId: string;
  industry?: string;
}

export interface RuleHit {
  ruleId: string;
  description: string;
  severity: string;
  action: string;
}

export interface ValidationResult {
  pass: boolean;
  outcome: 'allow' | 'warn' | 'block';
  reasons: string[];
  ruleHits: RuleHit[];
}

export class KBValidatorService {
  /**
   * Validate a change against KB rules
   */
  async validateChange(
    change: Pick<Change, 'changeType' | 'scope' | 'affectedUrls' | 'description'>,
    context: WebsiteContext
  ): Promise<ValidationResult> {
    const activeRules = await db.select()
      .from(kbRules)
      .where(eq(kbRules.active, true));

    const ruleHits: RuleHit[] = [];
    const reasons: string[] = [];
    let hasBlock = false;
    let hasWarn = false;

    for (const rule of activeRules) {
      if (this.ruleMatches(rule, change, context)) {
        ruleHits.push({
          ruleId: rule.ruleId,
          description: rule.description,
          severity: rule.severity,
          action: rule.action,
        });
        
        reasons.push(`${rule.action.toUpperCase()}: ${rule.description}`);
        
        if (rule.action === 'block') {
          hasBlock = true;
        } else if (rule.action === 'warn') {
          hasWarn = true;
        }
      }
    }

    let outcome: 'allow' | 'warn' | 'block' = 'allow';
    if (hasBlock) {
      outcome = 'block';
    } else if (hasWarn) {
      outcome = 'warn';
    }

    return {
      pass: !hasBlock,
      outcome,
      reasons,
      ruleHits,
    };
  }

  /**
   * Check if a rule matches the change
   */
  private ruleMatches(
    rule: KbRule,
    change: Pick<Change, 'changeType' | 'scope' | 'affectedUrls'>,
    context: WebsiteContext
  ): boolean {
    const conditions = rule.conditions as {
      change_type?: string;
      scope?: string;
      website_industry?: string;
      url_pattern?: string;
    } | null;

    if (!conditions) return false;

    // Check change_type condition
    if (conditions.change_type && conditions.change_type !== change.changeType) {
      return false;
    }

    // Check scope condition
    if (conditions.scope && conditions.scope !== change.scope) {
      return false;
    }

    // Check website industry condition
    if (conditions.website_industry && conditions.website_industry !== context.industry) {
      return false;
    }

    // Check URL pattern condition
    if (conditions.url_pattern && change.affectedUrls) {
      const pattern = new RegExp(conditions.url_pattern);
      const urlsMatch = change.affectedUrls.some(url => pattern.test(url));
      if (!urlsMatch) return false;
    }

    return true;
  }

  /**
   * Get all active rules
   */
  async getActiveRules(): Promise<KbRule[]> {
    return db.select()
      .from(kbRules)
      .where(eq(kbRules.active, true));
  }

  /**
   * Get all rules (for admin)
   */
  async getAllRules(): Promise<KbRule[]> {
    return db.select().from(kbRules);
  }

  /**
   * Create a new rule
   */
  async createRule(input: {
    ruleId: string;
    category: string;
    description: string;
    severity?: string;
    action?: string;
    conditions?: Record<string, string>;
  }): Promise<KbRule> {
    const [rule] = await db.insert(kbRules)
      .values({
        ruleId: input.ruleId,
        category: input.category,
        description: input.description,
        severity: input.severity || 'medium',
        action: input.action || 'warn',
        conditions: input.conditions || null,
      })
      .returning();
    return rule;
  }
}

export const kbValidatorService = new KBValidatorService();
