import { v4 as uuidv4 } from 'uuid';
import { db, AutomationRuleRecord, AutomationExecutionRecord, ActivityRecord } from '../../db';

const MAX_EXECUTION_DEPTH = 5;

export const evaluateCondition = (targetValue: any, operator: string, ruleValue: any): boolean => {
  switch (operator) {
    case '==':
    case 'equals':
      return targetValue === ruleValue;
    case '!=':
    case 'not_equals':
      return targetValue !== ruleValue;
    case '>':
      return Number(targetValue) > Number(ruleValue);
    case '>=':
      return Number(targetValue) >= Number(ruleValue);
    case '<':
      return Number(targetValue) < Number(ruleValue);
    case '<=':
      return Number(targetValue) <= Number(ruleValue);
    case 'contains':
      return String(targetValue).toLowerCase().includes(String(ruleValue).toLowerCase());
    case 'in':
      return Array.isArray(ruleValue) && ruleValue.includes(targetValue);
    default:
      return false;
  }
};

export const runAutomationTrigger = async (
  triggerEvent: 'LEAD_CREATED' | 'STAGE_CHANGED' | 'SCORE_UPDATED' | 'ACTIVITY_LOGGED',
  context: {
    orgId: string;
    lead?: any;
    opportunity?: any;
    previousStageId?: string;
    newStageId?: string;
    depthLevel?: number;
  }
) => {
  const currentDepth = context.depthLevel || 1;

  const rules = Array.from(db.automationRules.values()).filter(
    (r) => r.org_id === context.orgId && r.is_active && r.trigger_event === triggerEvent
  );

  for (const rule of rules) {
    const execId = uuidv4();
    const entityId = context.lead?.id || context.opportunity?.id || 'unknown';
    const entityType = context.lead ? 'LEAD' : context.opportunity ? 'OPPORTUNITY' : 'GENERAL';

    // Infinite Automation Loop Safeguard (Assessment 07)
    if (currentDepth > MAX_EXECUTION_DEPTH) {
      db.automationExecutions.set(execId, {
        id: execId,
        rule_id: rule.id,
        entity_type: entityType,
        entity_id: entityId,
        trigger_event: triggerEvent,
        status: 'ABORTED_LOOP',
        retry_count: 0,
        depth_level: currentDepth,
        payload: { triggerEvent, entityId },
        result: null,
        error_message: `Automation aborted: Recursion depth exceeded maximum limit (${MAX_EXECUTION_DEPTH}). Infinite loop detected and blocked.`,
        executed_at: new Date().toISOString(),
      });
      console.warn(`[Automation Safeguard] Recursion limit reached for rule ${rule.name}. Aborted.`);
      continue;
    }

    // Evaluate all conditions
    const payloadObject = context.lead || context.opportunity || {};
    let matchesAllConditions = true;

    for (const condition of rule.conditions) {
      const fieldVal = payloadObject[condition.field];
      if (!evaluateCondition(fieldVal, condition.operator, condition.value)) {
        matchesAllConditions = false;
        break;
      }
    }

    if (!matchesAllConditions) {
      continue;
    }

    // Execute actions
    const actionResults: any[] = [];
    let isSuccess = true;
    let errorMessage: string | null = null;

    try {
      for (const action of rule.actions) {
        if (action.type === 'CREATE_TASK') {
          const actId = uuidv4();
          const newActivity: ActivityRecord = {
            id: actId,
            org_id: context.orgId,
            performed_by_id: payloadObject.owner_id || 'system-automation',
            activity_type: 'TASK',
            subject: action.params.title || 'Automated CRM Follow-Up Task',
            description: `Automated task created by rule: ${rule.name}`,
            entity_type: entityType as any,
            entity_id: entityId,
            scheduled_at: new Date(Date.now() + (action.params.due_days || 1) * 24 * 60 * 60 * 1000).toISOString(),
            completed_at: null,
            status: 'PENDING',
            metadata: { ruleId: rule.id },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          db.activities.set(actId, newActivity);
          actionResults.push({ type: 'CREATE_TASK', taskId: actId });
        } else if (action.type === 'SEND_NOTIFICATION') {
          actionResults.push({
            type: 'SEND_NOTIFICATION',
            channel: action.params.channel || 'IN_APP',
            status: 'DELIVERED_SANDBOX',
            message: action.params.message,
          });
        } else if (action.type === 'ASSIGN_OWNER') {
          if (context.lead && action.params.ownerId) {
            context.lead.owner_id = action.params.ownerId;
            actionResults.push({ type: 'ASSIGN_OWNER', newOwnerId: action.params.ownerId });
          }
        }
      }
    } catch (err: any) {
      isSuccess = false;
      errorMessage = err.message;
    }

    // Record Execution in History
    db.automationExecutions.set(execId, {
      id: execId,
      rule_id: rule.id,
      entity_type: entityType,
      entity_id: entityId,
      trigger_event: triggerEvent,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      retry_count: isSuccess ? 0 : 1,
      depth_level: currentDepth,
      payload: { triggerEvent, entityId },
      result: actionResults,
      error_message: errorMessage,
      executed_at: new Date().toISOString(),
    });
  }
};
