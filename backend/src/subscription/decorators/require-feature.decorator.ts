import { SetMetadata } from '@nestjs/common';

export type PlanFeature = 'canExportReports' | 'canViewAuditLogs';

export const REQUIRE_FEATURE_KEY = 'require_feature';
export const RequireFeature = (feature: PlanFeature) =>
  SetMetadata(REQUIRE_FEATURE_KEY, feature);
