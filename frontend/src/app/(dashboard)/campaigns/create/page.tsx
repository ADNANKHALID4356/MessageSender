'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Send,
  Users,
  MessageSquare,
  Calendar,
  Shield,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores';
import { useCreateCampaign, useSegments, usePages } from '@/hooks';

// ===========================================
// Types
// ===========================================
type CampaignType = 'ONE_TIME' | 'SCHEDULED' | 'RECURRING' | 'DRIP';
type AudienceType = 'ALL' | 'SEGMENT' | 'PAGES' | 'MANUAL';
type BypassMethod = 'WITHIN_WINDOW' | 'MESSAGE_TAG_CONFIRMED_EVENT' | 'MESSAGE_TAG_POST_PURCHASE' | 'MESSAGE_TAG_ACCOUNT_UPDATE' | 'MESSAGE_TAG_HUMAN_AGENT' | 'OTN_TOKEN' | 'RECURRING_NOTIFICATION';

interface CampaignFormData {
  name: string;
  description: string;
  campaignType: CampaignType;
  audienceType: AudienceType;
  audienceSegmentId?: string;
  audiencePageIds: string[];
  messageContent: {
    text: string;
    attachmentUrl?: string;
    messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE';
  };
  bypassMethod?: BypassMethod;
  messageTag?: string;
  scheduledAt?: string;
  timezone: string;
  // Drip Sequence config
  dripSteps: Array<{ delayHours: number; message: string }>;
  // A/B Testing config
  abVariants: Array<{ name: string; message: string; percentage: number }>;
  abWinnerMetric: 'open_rate' | 'click_rate' | 'reply_rate';
  // Trigger config
  triggerEvent: string;
  triggerConditions: string;
}

const STEPS = [
  { id: 'details', label: 'Campaign Details', icon: MessageSquare },
  { id: 'audience', label: 'Select Audience', icon: Users },
  { id: 'message', label: 'Compose Message', icon: Send },
  { id: 'config', label: 'Advanced Config', icon: Zap },
  { id: 'bypass', label: 'Bypass Method', icon: Shield },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'review', label: 'Review & Launch', icon: Check },
];

const CAMPAIGN_TYPES: { value: CampaignType; label: string; description: string }[] = [
  { value: 'ONE_TIME', label: 'One-Time', description: 'Send once to selected audience' },
  { value: 'SCHEDULED', label: 'Scheduled', description: 'Send at a specific date and time' },
  { value: 'RECURRING', label: 'Recurring', description: 'Repeat at set intervals' },
  { value: 'DRIP', label: 'Drip Sequence', description: 'Automated multi-step sequence' },
];

const BYPASS_METHODS: { value: BypassMethod; label: string; description: string; warning?: string }[] = [
  { value: 'WITHIN_WINDOW', label: 'Within 24-Hour Window', description: 'Only send to contacts within the messaging window' },
  { value: 'MESSAGE_TAG_CONFIRMED_EVENT', label: 'Confirmed Event Update', description: 'Event reminders or changes', warning: 'Only for confirmed events — misuse may result in penalties' },
  { value: 'MESSAGE_TAG_POST_PURCHASE', label: 'Post-Purchase Update', description: 'Order status and shipping updates', warning: 'Only for purchase-related updates' },
  { value: 'MESSAGE_TAG_ACCOUNT_UPDATE', label: 'Account Update', description: 'Account alerts and payment issues', warning: 'Only for important account changes' },
  { value: 'MESSAGE_TAG_HUMAN_AGENT', label: 'Human Agent', description: 'Live support responses (7-day limit)', warning: 'Only for human customer support replies' },
  { value: 'OTN_TOKEN', label: 'One-Time Notification', description: 'Use OTN tokens (single-use per contact)' },
  { value: 'RECURRING_NOTIFICATION', label: 'Recurring Notification', description: 'Use recurring notification subscriptions' },
];

export default function CampaignCreatePage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    campaignType: 'ONE_TIME',
    audienceType: 'ALL',
    audiencePageIds: [],
    messageContent: {
      text: '',
      messageType: 'TEXT',
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dripSteps: [{ delayHours: 24, message: '' }],
    abVariants: [
      { name: 'Variant A', message: '', percentage: 50 },
      { name: 'Variant B', message: '', percentage: 50 },
    ],
    abWinnerMetric: 'open_rate',
    triggerEvent: '',
    triggerConditions: '',
  });

  const [stepError, setStepError] = useState('');

  const workspaceId = currentWorkspace?.id || '';
  const createCampaign = useCreateCampaign(workspaceId);
  const { data: segmentsData } = useSegments({ page: 1, limit: 100 });
  const { data: pagesData } = usePages(workspaceId);

  const segments = segmentsData?.data || [];
  const pages = pagesData || [];

  const updateForm = (updates: Partial<CampaignFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return !!formData.name.trim();
      case 1: return formData.audienceType === 'ALL' || 
                     (formData.audienceType === 'SEGMENT' && !!formData.audienceSegmentId) ||
                     (formData.audienceType === 'PAGES' && formData.audiencePageIds.length > 0);
      case 2: return !!formData.messageContent.text.trim();
      case 3: return true; // Advanced Config is optional
      case 4: return true; // Bypass is optional (defaults to window)
      case 5: return formData.campaignType === 'ONE_TIME' || !!formData.scheduledAt;
      case 6: return true;
      default: return false;
    }
  };

  const getStepError = (): string => {
    switch (currentStep) {
      case 0: return !formData.name.trim() ? 'Campaign name is required' : '';
      case 1:
        if (formData.audienceType === 'SEGMENT' && !formData.audienceSegmentId) return 'Please select a segment';
        if (formData.audienceType === 'PAGES' && formData.audiencePageIds.length === 0) return 'Please select at least one page';
        return '';
      case 2: return !formData.messageContent.text.trim() ? 'Message text is required' : '';
      case 5: return formData.campaignType !== 'ONE_TIME' && !formData.scheduledAt ? 'Please set a schedule date' : '';
      default: return '';
    }
  };

  const handleNext = () => {
    const error = getStepError();
    if (error) {
      setStepError(error);
      return;
    }
    setStepError('');
    setCurrentStep(currentStep + 1);
  };

  const handleLaunch = async () => {
    try {
      const campaignTypeMap: Record<CampaignType, 'broadcast' | 'otn' | 'recurring'> = {
        ONE_TIME: 'broadcast',
        SCHEDULED: 'broadcast',
        RECURRING: 'recurring',
        DRIP: 'broadcast',
      };

      await createCampaign.mutateAsync({
        name: formData.name,
        description: formData.description,
        type: campaignTypeMap[formData.campaignType],
        segmentId: formData.audienceSegmentId,
        message: {
          type: formData.messageContent.messageType || 'TEXT',
          content: formData.messageContent.text,
        },
        scheduledAt: formData.scheduledAt,
      });
      router.push('/campaigns');
    } catch {
      // Error handled by hook
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
          <p className="text-muted-foreground">Please select a workspace first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Campaign</h1>
          <p className="text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              onClick={() => idx < currentStep && setCurrentStep(idx)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full',
                idx === currentStep && 'bg-primary text-primary-foreground',
                idx < currentStep && 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20',
                idx > currentStep && 'bg-muted text-muted-foreground',
              )}
            >
              <step.icon className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline truncate">{step.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={cn('h-px w-4 shrink-0', idx < currentStep ? 'bg-primary' : 'bg-muted')} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 0: Campaign Details */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Campaign Details</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Holiday Sale Announcement"
                    value={formData.name}
                    onChange={(e) => { updateForm({ name: e.target.value }); if (stepError) setStepError(''); }}
                    aria-invalid={!!stepError && currentStep === 0 && !formData.name.trim()}
                    className={cn(stepError && currentStep === 0 && !formData.name.trim() && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {stepError && currentStep === 0 && !formData.name.trim() && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {stepError}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Brief description of this campaign..."
                    value={formData.description}
                    onChange={(e) => updateForm({ description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Campaign Type</Label>
                  <div className="grid gap-3 mt-2 sm:grid-cols-2">
                    {CAMPAIGN_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => updateForm({ campaignType: type.value })}
                        className={cn(
                          'p-4 border rounded-lg text-left transition-colors',
                          formData.campaignType === type.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50',
                        )}
                      >
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Audience Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Select Audience</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: 'ALL' as AudienceType, label: 'All Contacts', desc: 'Send to everyone in this workspace' },
                  { value: 'SEGMENT' as AudienceType, label: 'Segment', desc: 'Send to a saved segment' },
                  { value: 'PAGES' as AudienceType, label: 'By Page', desc: 'Send to contacts of specific pages' },
                  { value: 'MANUAL' as AudienceType, label: 'Manual Selection', desc: 'Choose individual contacts' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateForm({ audienceType: opt.value })}
                    className={cn(
                      'p-4 border rounded-lg text-left transition-colors',
                      formData.audienceType === opt.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
                    )}
                  >
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {formData.audienceType === 'SEGMENT' && (
                <div>
                  <Label>Select Segment</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {segments.length > 0 ? segments.map((seg: any) => (
                      <button
                        key={seg.id}
                        onClick={() => updateForm({ audienceSegmentId: seg.id })}
                        className={cn(
                          'w-full p-3 border rounded-lg text-left transition-colors flex justify-between items-center',
                          formData.audienceSegmentId === seg.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
                        )}
                      >
                        <div>
                          <p className="font-medium">{seg.name}</p>
                          <p className="text-sm text-muted-foreground">{seg.description}</p>
                        </div>
                        <span className="text-sm font-medium">{seg.contactCount} contacts</span>
                      </button>
                    )) : (
                      <p className="text-sm text-muted-foreground">No segments available. Create one first.</p>
                    )}
                  </div>
                </div>
              )}

              {formData.audienceType === 'PAGES' && (
                <div>
                  <Label>Select Pages</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {pages.length > 0 ? pages.map((page: any) => (
                      <button
                        key={page.id}
                        onClick={() => {
                          const ids = formData.audiencePageIds.includes(page.id)
                            ? formData.audiencePageIds.filter((id) => id !== page.id)
                            : [...formData.audiencePageIds, page.id];
                          updateForm({ audiencePageIds: ids });
                        }}
                        className={cn(
                          'w-full p-3 border rounded-lg text-left transition-colors flex items-center gap-3',
                          formData.audiencePageIds.includes(page.id) ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
                        )}
                      >
                        <div className={cn(
                          'h-5 w-5 rounded border flex items-center justify-center',
                          formData.audiencePageIds.includes(page.id) ? 'bg-primary border-primary' : 'border-gray-300',
                        )}>
                          {formData.audiencePageIds.includes(page.id) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-medium">{page.name}</p>
                        </div>
                      </button>
                    )) : (
                      <p className="text-sm text-muted-foreground">No pages connected.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Message Composer */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Compose Message</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="message">Message Text *</Label>
                  <textarea
                    id="message"
                    className={cn(
                      'w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring',
                      stepError && currentStep === 2 && !formData.messageContent.text.trim() && 'border-destructive focus:ring-destructive'
                    )}
                    placeholder="Type your message here... Use {{first_name}}, {{last_name}}, {{page_name}} for personalization."
                    value={formData.messageContent.text}
                    onChange={(e) => {
                      updateForm({
                        messageContent: { ...formData.messageContent, text: e.target.value },
                      });
                      if (stepError) setStepError('');
                    }}
                    maxLength={2000}
                    aria-invalid={!!stepError && currentStep === 2 && !formData.messageContent.text.trim()}
                  />
                  <div className="flex justify-between mt-1">
                    <div className="flex gap-2">
                      {['{{first_name}}', '{{last_name}}', '{{page_name}}'].map((token) => (
                        <button
                          key={token}
                          onClick={() =>
                            updateForm({
                              messageContent: {
                                ...formData.messageContent,
                                text: formData.messageContent.text + ' ' + token,
                              },
                            })
                          }
                          className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formData.messageContent.text.length}/2000
                    </span>
                  </div>
                </div>

                {/* Preview */}
                {formData.messageContent.text && (
                  <div>
                    <Label>Preview</Label>
                    <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-none p-3 max-w-xs ml-auto">
                        <p className="text-sm whitespace-pre-wrap">
                          {formData.messageContent.text
                            .replace('{{first_name}}', 'John')
                            .replace('{{last_name}}', 'Doe')
                            .replace('{{page_name}}', 'My Business')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Advanced Config */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Advanced Configuration</h2>

              {formData.campaignType === 'DRIP' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Drip Sequence Steps</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateForm({
                          dripSteps: [...formData.dripSteps, { delayHours: 24, message: '' }],
                        })
                      }
                    >
                      + Add Step
                    </Button>
                  </div>
                  {formData.dripSteps.map((step, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">Step {idx + 1}</p>
                        {formData.dripSteps.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive h-7 px-2"
                            onClick={() =>
                              updateForm({
                                dripSteps: formData.dripSteps.filter((_, i) => i !== idx),
                              })
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div>
                        <Label>Delay (hours after previous step)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={step.delayHours}
                          onChange={(e) => {
                            const updated = [...formData.dripSteps];
                            updated[idx] = { ...updated[idx], delayHours: parseInt(e.target.value) || 1 };
                            updateForm({ dripSteps: updated });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Message</Label>
                        <textarea
                          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder={`Message for step ${idx + 1}...`}
                          value={step.message}
                          onChange={(e) => {
                            const updated = [...formData.dripSteps];
                            updated[idx] = { ...updated[idx], message: e.target.value };
                            updateForm({ dripSteps: updated });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formData.campaignType === 'ONE_TIME' && (
                <div className="space-y-4">
                  <Label>A/B Testing Variants</Label>
                  <p className="text-sm text-muted-foreground">
                    Split your audience between message variants to find the best performer.
                  </p>
                  {formData.abVariants.map((variant, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Input
                          className="max-w-[200px] font-medium"
                          value={variant.name}
                          onChange={(e) => {
                            const updated = [...formData.abVariants];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            updateForm({ abVariants: updated });
                          }}
                        />
                        {formData.abVariants.length > 2 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive h-7 px-2"
                            onClick={() =>
                              updateForm({
                                abVariants: formData.abVariants.filter((_, i) => i !== idx),
                              })
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div>
                        <Label>Message</Label>
                        <textarea
                          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder={`Message for ${variant.name}...`}
                          value={variant.message}
                          onChange={(e) => {
                            const updated = [...formData.abVariants];
                            updated[idx] = { ...updated[idx], message: e.target.value };
                            updateForm({ abVariants: updated });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Traffic Split (%)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={variant.percentage}
                          onChange={(e) => {
                            const updated = [...formData.abVariants];
                            updated[idx] = { ...updated[idx], percentage: parseInt(e.target.value) || 0 };
                            updateForm({ abVariants: updated });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateForm({
                          abVariants: [
                            ...formData.abVariants,
                            { name: `Variant ${String.fromCharCode(65 + formData.abVariants.length)}`, message: '', percentage: 0 },
                          ],
                        })
                      }
                    >
                      + Add Variant
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Total: {formData.abVariants.reduce((s, v) => s + v.percentage, 0)}%
                      {formData.abVariants.reduce((s, v) => s + v.percentage, 0) !== 100 && (
                        <span className="text-amber-600 ml-2">(should be 100%)</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Winner Metric</Label>
                    <div className="flex gap-2 mt-2">
                      {(['open_rate', 'click_rate', 'reply_rate'] as const).map((metric) => (
                        <button
                          key={metric}
                          onClick={() => updateForm({ abWinnerMetric: metric })}
                          className={cn(
                            'px-4 py-2 border rounded-lg text-sm transition-colors',
                            formData.abWinnerMetric === metric
                              ? 'border-primary bg-primary/5 font-medium'
                              : 'hover:border-primary/50',
                          )}
                        >
                          {metric.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {formData.campaignType === 'RECURRING' && (
                <div className="space-y-4">
                  <Label>Trigger Configuration</Label>
                  <p className="text-sm text-muted-foreground">
                    Define what event triggers this campaign to send.
                  </p>
                  <div>
                    <Label htmlFor="triggerEvent">Trigger Event</Label>
                    <select
                      id="triggerEvent"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.triggerEvent}
                      onChange={(e) => updateForm({ triggerEvent: e.target.value })}
                    >
                      <option value="">Select trigger event...</option>
                      <option value="contact_subscribed">Contact Subscribed</option>
                      <option value="contact_tagged">Contact Tagged</option>
                      <option value="contact_entered_segment">Contact Entered Segment</option>
                      <option value="time_interval">Time Interval</option>
                      <option value="custom_event">Custom Event</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="triggerConditions">Conditions (optional)</Label>
                    <textarea
                      id="triggerConditions"
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g., tag = 'VIP' AND subscribed_days > 7"
                      value={formData.triggerConditions}
                      onChange={(e) => updateForm({ triggerConditions: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {formData.campaignType === 'SCHEDULED' && (
                <div className="p-4 border rounded-lg bg-muted/50 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No advanced configuration needed for scheduled campaigns. Continue to the next step.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Bypass Method */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">24-Hour Bypass Method</h2>
              <p className="text-sm text-muted-foreground">
                Choose how to send to contacts whose 24-hour messaging window has expired.
                Contacts within the window will receive the message directly.
              </p>
              <div className="space-y-3">
                {BYPASS_METHODS.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => updateForm({ bypassMethod: method.value })}
                    className={cn(
                      'w-full p-4 border rounded-lg text-left transition-colors',
                      formData.bypassMethod === method.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'h-5 w-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0',
                        formData.bypassMethod === method.value ? 'border-primary' : 'border-gray-300',
                      )}>
                        {formData.bypassMethod === method.value && (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{method.label}</p>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                        {method.warning && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {method.warning}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Schedule */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Schedule</h2>
              {formData.campaignType === 'ONE_TIME' ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    This is a one-time campaign. It will be sent immediately after launch.
                  </p>
                  <div className="p-4 border rounded-lg bg-muted/50 flex items-center gap-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <p className="font-medium">Ready to send immediately</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="scheduledAt">Schedule Date & Time</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={formData.scheduledAt || ''}
                      onChange={(e) => updateForm({ scheduledAt: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={formData.timezone}
                      onChange={(e) => updateForm({ timezone: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Review Campaign</h2>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="font-medium">{formData.name}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{CAMPAIGN_TYPES.find((t) => t.value === formData.campaignType)?.label}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Audience</p>
                  <p className="font-medium capitalize">{formData.audienceType.toLowerCase().replace('_', ' ')}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Message Preview</p>
                  <p className="font-medium whitespace-pre-wrap">{formData.messageContent.text.substring(0, 200)}{formData.messageContent.text.length > 200 ? '...' : ''}</p>
                </div>
                {formData.bypassMethod && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Bypass Method</p>
                    <p className="font-medium">{BYPASS_METHODS.find((m) => m.value === formData.bypassMethod)?.label}</p>
                  </div>
                )}
                {formData.scheduledAt && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Scheduled For</p>
                    <p className="font-medium">{new Date(formData.scheduledAt).toLocaleString()} ({formData.timezone})</p>
                  </div>
                )}
                {formData.campaignType === 'DRIP' && formData.dripSteps.some((s) => s.message) && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Drip Sequence</p>
                    <p className="font-medium">{formData.dripSteps.length} steps configured</p>
                  </div>
                )}
                {formData.campaignType === 'ONE_TIME' && formData.abVariants.some((v) => v.message) && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">A/B Testing</p>
                    <p className="font-medium">{formData.abVariants.length} variants &middot; Winner by {formData.abWinnerMetric.replace('_', ' ')}</p>
                  </div>
                )}
                {formData.triggerEvent && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Trigger</p>
                    <p className="font-medium">{formData.triggerEvent.replace(/_/g, ' ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Error Banner */}
      {stepError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in slide-in-from-top-1 fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {stepError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => { setStepError(''); currentStep > 0 ? setCurrentStep(currentStep - 1) : router.push('/campaigns'); }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </Button>
        <div className="flex gap-2">
          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleLaunch}
              disabled={createCampaign.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createCampaign.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {formData.campaignType === 'SCHEDULED' ? 'Schedule Campaign' : 'Launch Campaign'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
