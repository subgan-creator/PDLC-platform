import type { Id, ISODateTimeString, TenantScoped, Timestamped, UserId } from './common';
import type { StoryId } from './definition';
import type { InitiativeId } from './initiative';

/**
 * Quality Workspace (JTBD 7): test strategy, test cases linked to ACs and
 * business rules, UAT with business testers, defect triage, and a coverage
 * view surfacing requirements/rules with no test.
 */
export interface TestStrategy extends Timestamped, TenantScoped {
  id: Id<'TestStrategy'>;
  initiativeId: InitiativeId;
  approach: string;
  entryCriteria: string;
  exitCriteria: string;
}

export type TestCaseId = Id<'TestCase'>;

export interface TestCase extends Timestamped, TenantScoped {
  id: TestCaseId;
  initiativeId: InitiativeId;
  title: string;
  steps: string;
  expectedResult: string;
  linkedStoryId: StoryId | null;
  linkedAcceptanceCriterionId: Id<'AcceptanceCriterion'> | null;
  linkedBusinessRuleId: Id<'BusinessRule'> | null;
  /** Xray/qTest/TestRail sync once the Integration Service connector ships (A6). */
  externalRef: { system: 'xray' | 'qtest' | 'testrail'; externalId: string } | null;
}

export type UatRoundStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface UatRound extends Timestamped, TenantScoped {
  id: Id<'UatRound'>;
  initiativeId: InitiativeId;
  name: string;
  status: UatRoundStatus;
  businessTesterIds: UserId[];
  startDate: ISODateTimeString | null;
  endDate: ISODateTimeString | null;
}

export interface TestRun extends Timestamped, TenantScoped {
  id: Id<'TestRun'>;
  testCaseId: TestCaseId;
  uatRoundId: Id<'UatRound'> | null;
  executedBy: UserId;
  executedAt: ISODateTimeString;
  result: 'pass' | 'fail' | 'blocked' | 'not_executed';
  notes: string | null;
}

export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DefectStatus = 'open' | 'triaged' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';

export interface Defect extends Timestamped, TenantScoped {
  id: Id<'Defect'>;
  initiativeId: InitiativeId;
  testRunId: Id<'TestRun'> | null;
  title: string;
  severity: DefectSeverity;
  status: DefectStatus;
  reportedBy: UserId;
  assignedTo: UserId | null;
}

/** Coverage view row: a requirement/rule with zero linked, passing test cases. */
export interface CoverageGap {
  initiativeId: InitiativeId;
  requirementType: 'acceptance_criterion' | 'business_rule';
  requirementId: Id<'AcceptanceCriterion'> | Id<'BusinessRule'>;
  requirementLabel: string;
  gapReason: 'no_test_case' | 'no_passing_run';
}
