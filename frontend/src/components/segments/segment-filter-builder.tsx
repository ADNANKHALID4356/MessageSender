'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  GripVertical,
  Copy,
  AlertCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SegmentFilters, FilterGroup, FilterCondition } from '@/services/segment.service';

// ===========================================
// Constants
// ===========================================

interface FieldInfo {
  label: string;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'tag' | 'page' | 'custom';
  operators: string[];
  options?: { label: string; value: string }[];
}

const FILTER_FIELDS: Record<string, FieldInfo> = {
  firstName:              { label: 'First Name',              category: 'Contact',    type: 'string',  operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'IS_NULL', 'IS_NOT_NULL'] },
  lastName:               { label: 'Last Name',               category: 'Contact',    type: 'string',  operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'IS_NULL', 'IS_NOT_NULL'] },
  fullName:               { label: 'Full Name',               category: 'Contact',    type: 'string',  operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'IS_NULL', 'IS_NOT_NULL'] },
  email:                  { label: 'Email',                    category: 'Contact',    type: 'string',  operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'IS_NULL', 'IS_NOT_NULL'] },
  phone:                  { label: 'Phone',                    category: 'Contact',    type: 'string',  operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'IS_NULL', 'IS_NOT_NULL'] },
  gender:                 { label: 'Gender',                   category: 'Contact',    type: 'select',  operators: ['EQUALS', 'NOT_EQUALS', 'IS_NULL', 'IS_NOT_NULL'], options: [ { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' } ] },
  locale:                 { label: 'Locale',                   category: 'Contact',    type: 'string',  operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS'] },
  timezone:               { label: 'Timezone',                 category: 'Contact',    type: 'string',  operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS'] },
  source:                 { label: 'Source',                   category: 'Contact',    type: 'select',  operators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'], options: [ { label: 'Messenger', value: 'MESSENGER' }, { label: 'Manual', value: 'MANUAL' }, { label: 'Import', value: 'IMPORT' }, { label: 'API', value: 'API' } ] },
  isBlocked:              { label: 'Is Blocked',               category: 'Contact',    type: 'boolean', operators: ['IS_TRUE', 'IS_FALSE'] },
  isSubscribed:           { label: 'Is Subscribed',            category: 'Contact',    type: 'boolean', operators: ['IS_TRUE', 'IS_FALSE'] },
  totalMessagesSent:      { label: 'Messages Sent',            category: 'Engagement', type: 'number',  operators: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'BETWEEN'] },
  totalMessagesReceived:  { label: 'Messages Received',        category: 'Engagement', type: 'number',  operators: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'BETWEEN'] },
  lastMessageFromContactAt:{ label: 'Last Msg From Contact',  category: 'Engagement', type: 'date',    operators: ['BEFORE', 'AFTER', 'WITHIN_LAST', 'NOT_WITHIN_LAST', 'IS_NULL', 'IS_NOT_NULL'] },
  lastMessageToContactAt: { label: 'Last Msg To Contact',     category: 'Engagement', type: 'date',    operators: ['BEFORE', 'AFTER', 'WITHIN_LAST', 'NOT_WITHIN_LAST', 'IS_NULL', 'IS_NOT_NULL'] },
  firstInteractionAt:     { label: 'First Interaction',        category: 'Engagement', type: 'date',    operators: ['BEFORE', 'AFTER', 'WITHIN_LAST', 'NOT_WITHIN_LAST', 'IS_NULL', 'IS_NOT_NULL'] },
  lastInteractionAt:      { label: 'Last Interaction',         category: 'Engagement', type: 'date',    operators: ['BEFORE', 'AFTER', 'WITHIN_LAST', 'NOT_WITHIN_LAST', 'IS_NULL', 'IS_NOT_NULL'] },
  hasTag:                 { label: 'Has Tag',                  category: 'Tags',       type: 'tag',     operators: ['EQUALS'] },
  doesNotHaveTag:         { label: 'Does Not Have Tag',        category: 'Tags',       type: 'tag',     operators: ['EQUALS'] },
  pageId:                 { label: 'Page',                     category: 'Page',       type: 'page',    operators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'] },
  customField:            { label: 'Custom Field',             category: 'Custom',     type: 'custom',  operators: ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'GREATER_THAN', 'LESS_THAN', 'IS_NULL', 'IS_NOT_NULL'] },
  isWithin24HWindow:      { label: 'Within 24h Window',        category: 'Window',     type: 'boolean', operators: ['IS_TRUE', 'IS_FALSE'] },
};

const OPERATOR_LABELS: Record<string, string> = {
  EQUALS: 'equals',
  NOT_EQUALS: 'does not equal',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'does not contain',
  STARTS_WITH: 'starts with',
  ENDS_WITH: 'ends with',
  GREATER_THAN: 'greater than',
  LESS_THAN: 'less than',
  GREATER_THAN_OR_EQUAL: '≥',
  LESS_THAN_OR_EQUAL: '≤',
  BETWEEN: 'between',
  IN: 'is any of',
  NOT_IN: 'is none of',
  IS_NULL: 'is empty',
  IS_NOT_NULL: 'is not empty',
  IS_TRUE: 'is true',
  IS_FALSE: 'is false',
  BEFORE: 'before',
  AFTER: 'after',
  WITHIN_LAST: 'within last',
  NOT_WITHIN_LAST: 'not within last',
};

const FIELD_CATEGORIES = ['Contact', 'Engagement', 'Tags', 'Page', 'Window', 'Custom'];

const NO_VALUE_OPERATORS = ['IS_NULL', 'IS_NOT_NULL', 'IS_TRUE', 'IS_FALSE'];

// ===========================================
// Props
// ===========================================

interface SegmentFilterBuilderProps {
  filters: SegmentFilters;
  onChange: (filters: SegmentFilters) => void;
  onPreview?: () => void;
  previewCount?: number | null;
  isPreviewLoading?: boolean;
}

// ===========================================
// Component
// ===========================================

export function SegmentFilterBuilder({
  filters,
  onChange,
  onPreview,
  previewCount,
  isPreviewLoading,
}: SegmentFilterBuilderProps) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(0);

  const updateGroupLogic = (logic: 'AND' | 'OR') => {
    onChange({ ...filters, logic });
  };

  const addGroup = () => {
    const newGroup: FilterGroup = {
      logic: 'AND',
      conditions: [{ field: 'firstName', operator: 'CONTAINS', value: '' }],
    };
    const newFilters = {
      ...filters,
      groups: [...filters.groups, newGroup],
    };
    onChange(newFilters);
    setExpandedGroup(newFilters.groups.length - 1);
  };

  const removeGroup = (groupIndex: number) => {
    onChange({
      ...filters,
      groups: filters.groups.filter((_, i) => i !== groupIndex),
    });
    setExpandedGroup(null);
  };

  const duplicateGroup = (groupIndex: number) => {
    const group = filters.groups[groupIndex];
    const clone: FilterGroup = JSON.parse(JSON.stringify(group));
    const newGroups = [...filters.groups];
    newGroups.splice(groupIndex + 1, 0, clone);
    onChange({ ...filters, groups: newGroups });
    setExpandedGroup(groupIndex + 1);
  };

  const updateGroup = (groupIndex: number, group: FilterGroup) => {
    const newGroups = [...filters.groups];
    newGroups[groupIndex] = group;
    onChange({ ...filters, groups: newGroups });
  };

  const addCondition = (groupIndex: number) => {
    const group = filters.groups[groupIndex];
    const newCondition: FilterCondition = {
      field: 'firstName',
      operator: 'CONTAINS',
      value: '',
    };
    updateGroup(groupIndex, {
      ...group,
      conditions: [...group.conditions, newCondition],
    });
  };

  const updateCondition = (groupIndex: number, condIndex: number, condition: FilterCondition) => {
    const group = filters.groups[groupIndex];
    const newConditions = [...group.conditions];
    newConditions[condIndex] = condition;
    updateGroup(groupIndex, { ...group, conditions: newConditions });
  };

  const removeCondition = (groupIndex: number, condIndex: number) => {
    const group = filters.groups[groupIndex];
    if (group.conditions.length <= 1) {
      removeGroup(groupIndex);
      return;
    }
    updateGroup(groupIndex, {
      ...group,
      conditions: group.conditions.filter((_, i) => i !== condIndex),
    });
  };

  return (
    <div className="space-y-4">
      {/* Top-level logic */}
      {filters.groups.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Match contacts where</span>
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => updateGroupLogic('AND')}
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                filters.logic === 'AND' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              ALL
            </button>
            <button
              onClick={() => updateGroupLogic('OR')}
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                filters.logic === 'OR' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              ANY
            </button>
          </div>
          <span className="text-muted-foreground">of these groups match</span>
        </div>
      )}

      {/* Filter Groups */}
      <div className="space-y-3">
        {filters.groups.map((group, groupIdx) => (
          <div key={groupIdx} className="border rounded-lg overflow-hidden">
            {/* Group Header */}
            <div
              className="flex items-center gap-2 px-3 py-2 bg-muted/50 cursor-pointer"
              onClick={() => setExpandedGroup(expandedGroup === groupIdx ? null : groupIdx)}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  expandedGroup === groupIdx && 'rotate-180',
                )}
              />
              <span className="text-sm font-medium flex-1">
                Group {groupIdx + 1}
                <span className="text-muted-foreground font-normal ml-2">
                  ({group.conditions.length} condition{group.conditions.length !== 1 ? 's' : ''})
                </span>
              </span>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => duplicateGroup(groupIdx)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeGroup(groupIdx)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Group Body */}
            {expandedGroup === groupIdx && (
              <div className="p-3 space-y-3">
                {/* Group logic */}
                {group.conditions.length > 1 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Match</span>
                    <div className="flex border rounded-md overflow-hidden">
                      <button
                        onClick={() => updateGroup(groupIdx, { ...group, logic: 'AND' })}
                        className={cn(
                          'px-2.5 py-0.5 text-xs font-medium transition-colors',
                          (group.logic || 'AND') === 'AND' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                        )}
                      >
                        ALL
                      </button>
                      <button
                        onClick={() => updateGroup(groupIdx, { ...group, logic: 'OR' })}
                        className={cn(
                          'px-2.5 py-0.5 text-xs font-medium transition-colors',
                          group.logic === 'OR' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                        )}
                      >
                        ANY
                      </button>
                    </div>
                    <span className="text-muted-foreground">conditions</span>
                  </div>
                )}

                {/* Conditions */}
                {group.conditions.map((condition, condIdx) => (
                  <ConditionRow
                    key={condIdx}
                    condition={condition}
                    onChange={(c) => updateCondition(groupIdx, condIdx, c)}
                    onRemove={() => removeCondition(groupIdx, condIdx)}
                    showLogic={condIdx > 0}
                    logic={group.logic || 'AND'}
                  />
                ))}

                {/* Add condition button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addCondition(groupIdx)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Condition
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add group + Preview */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addGroup}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Filter Group
        </Button>
        {onPreview && (
          <div className="flex items-center gap-3">
            {previewCount !== undefined && previewCount !== null && (
              <span className="text-sm text-muted-foreground">
                {previewCount} contact{previewCount !== 1 ? 's' : ''} matched
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onPreview}
              disabled={isPreviewLoading || filters.groups.length === 0}
            >
              {isPreviewLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5 mr-1" />
              )}
              Preview
            </Button>
          </div>
        )}
      </div>

      {filters.groups.length === 0 && (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No filter groups defined.</p>
          <p className="text-xs">Add a filter group to start building your segment criteria.</p>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Condition Row
// ===========================================

function ConditionRow({
  condition,
  onChange,
  onRemove,
  showLogic,
  logic,
}: {
  condition: FilterCondition;
  onChange: (c: FilterCondition) => void;
  onRemove: () => void;
  showLogic: boolean;
  logic: string;
}) {
  const fieldInfo = FILTER_FIELDS[condition.field];
  const needsValue = !NO_VALUE_OPERATORS.includes(condition.operator);

  const handleFieldChange = (field: string) => {
    const info = FILTER_FIELDS[field];
    const firstOp = info?.operators[0] || 'EQUALS';
    onChange({
      field,
      operator: firstOp,
      value: NO_VALUE_OPERATORS.includes(firstOp) ? undefined : '',
      customFieldKey: field === 'customField' ? '' : undefined,
    });
  };

  const handleOperatorChange = (operator: string) => {
    onChange({
      ...condition,
      operator,
      value: NO_VALUE_OPERATORS.includes(operator) ? undefined : condition.value || '',
    });
  };

  return (
    <div className="flex items-start gap-2 flex-wrap">
      {showLogic && (
        <span className="text-xs font-medium text-muted-foreground w-8 py-2 text-center shrink-0 uppercase">
          {logic}
        </span>
      )}
      {!showLogic && <div className="w-8 shrink-0" />}

      {/* Field Select */}
      <div className="min-w-[160px]">
        <select
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {FIELD_CATEGORIES.map((cat) => (
            <optgroup key={cat} label={cat}>
              {Object.entries(FILTER_FIELDS)
                .filter(([, info]) => info.category === cat)
                .map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Custom Field Key */}
      {condition.field === 'customField' && (
        <Input
          className="w-32 h-9 text-sm"
          placeholder="Field key..."
          value={condition.customFieldKey || ''}
          onChange={(e) => onChange({ ...condition, customFieldKey: e.target.value })}
        />
      )}

      {/* Operator Select */}
      <div className="min-w-[140px]">
        <select
          value={condition.operator}
          onChange={(e) => handleOperatorChange(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {(fieldInfo?.operators || ['EQUALS']).map((op) => (
            <option key={op} value={op}>{OPERATOR_LABELS[op] || op}</option>
          ))}
        </select>
      </div>

      {/* Value Input */}
      {needsValue && (
        <div className="flex-1 min-w-[120px]">
          {fieldInfo?.type === 'select' && fieldInfo.options ? (
            <select
              value={condition.value || ''}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select...</option>
              {fieldInfo.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : fieldInfo?.type === 'date' && !['WITHIN_LAST', 'NOT_WITHIN_LAST'].includes(condition.operator) ? (
            <Input
              type="date"
              className="h-9 text-sm"
              value={condition.value || ''}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
            />
          ) : fieldInfo?.type === 'number' || ['WITHIN_LAST', 'NOT_WITHIN_LAST'].includes(condition.operator) ? (
            <div className="flex gap-1 items-center">
              <Input
                type="number"
                className="h-9 text-sm"
                placeholder={['WITHIN_LAST', 'NOT_WITHIN_LAST'].includes(condition.operator) ? 'Days...' : 'Value...'}
                value={condition.operator === 'BETWEEN' ? (condition.value?.[0] ?? '') : (condition.value ?? '')}
                onChange={(e) => {
                  if (condition.operator === 'BETWEEN') {
                    const arr = Array.isArray(condition.value) ? [...condition.value] : ['', ''];
                    arr[0] = e.target.value;
                    onChange({ ...condition, value: arr });
                  } else {
                    onChange({ ...condition, value: e.target.value });
                  }
                }}
              />
              {condition.operator === 'BETWEEN' && (
                <>
                  <span className="text-xs text-muted-foreground">and</span>
                  <Input
                    type="number"
                    className="h-9 text-sm"
                    placeholder="Max..."
                    value={condition.value?.[1] ?? ''}
                    onChange={(e) => {
                      const arr = Array.isArray(condition.value) ? [...condition.value] : ['', ''];
                      arr[1] = e.target.value;
                      onChange({ ...condition, value: arr });
                    }}
                  />
                </>
              )}
              {['WITHIN_LAST', 'NOT_WITHIN_LAST'].includes(condition.operator) && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">days</span>
              )}
            </div>
          ) : (
            <Input
              className="h-9 text-sm"
              placeholder="Value..."
              value={condition.value || ''}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
            />
          )}
        </div>
      )}

      {/* Remove */}
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ===========================================
// Helper to get default empty filters
// ===========================================

export function getEmptyFilters(): SegmentFilters {
  return {
    logic: 'AND',
    groups: [],
  };
}
