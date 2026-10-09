export const INDUSTRIES = Object.freeze([
  'fintech', 'healthtech', 'edtech', 'ecommerce', 'saas', 'marketplace',
  'deeptech', 'cleantech', 'biotech', 'logistics', 'proptech', 'legaltech',
  'hrtech', 'gaming', 'media', 'consumer', 'enterprise', 'other',
]);

export const STAGES = Object.freeze([
  'pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth', 'unknown',
]);

export const BUSINESS_MODELS = Object.freeze([
  'b2b', 'b2c', 'b2b2c', 'marketplace', 'saas', 'hardware', 'deeptech', 'other',
]);

export const INVESTOR_TYPES = Object.freeze([
  'angel', 'vc', 'family-office', 'corporate-vc', 'accelerator', 'government', 'other',
]);

export const PIPELINE_STAGES = Object.freeze([
  'shortlisted', 'contacted', 'meeting-scheduled', 'in-discussion',
  'due-diligence', 'committed', 'closed-won', 'closed-lost',
]);

export const ACTIVITY_TYPES = Object.freeze([
  'startup_created', 'startup_updated', 'investor_saved', 'investor_unsaved',
  'deal_created', 'deal_stage_changed', 'follow_up_scheduled',
  'pitch_analysis_created', 'pitch_draft_saved', 'account_updated', 'password_changed', 'contact', 'note_added'
]);

export const ALGORITHM_VERSION = '1.0.0';
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;
