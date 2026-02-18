'use client';

import { useState } from 'react';
import { useCustomFields } from '@/hooks/use-custom-fields';
import { useToast } from '@/hooks/use-toast';
import { CustomFieldType, CustomFieldDefinition } from '@/services/custom-fields.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const FIELD_TYPE_OPTIONS: { value: CustomFieldType; label: string }[] = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'DROPDOWN', label: 'Dropdown' },
  { value: 'CHECKBOX', label: 'Checkbox' },
];

interface CustomFieldFormData {
  fieldName: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  options: string;
  isRequired: boolean;
}

const emptyForm: CustomFieldFormData = {
  fieldName: '',
  fieldKey: '',
  fieldType: 'TEXT',
  options: '',
  isRequired: false,
};

export function CustomFieldsManager() {
  const { definitions, isLoading, create, update, remove, isCreating, isDeleting } = useCustomFields();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomFieldFormData>(emptyForm);

  const autoGenerateKey = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^[0-9]/, '_$&');

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      fieldName: name,
      fieldKey: editingId ? prev.fieldKey : autoGenerateKey(name),
    }));
  };

  const handleSubmit = async () => {
    if (!form.fieldName.trim()) {
      toast({ title: 'Field name is required', variant: 'destructive' });
      return;
    }

    try {
      const options =
        form.fieldType === 'DROPDOWN'
          ? form.options
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined;

      if (editingId) {
        await update({
          fieldId: editingId,
          dto: {
            fieldName: form.fieldName,
            fieldType: form.fieldType,
            options,
            isRequired: form.isRequired,
          },
        });
        toast({ title: 'Custom field updated' });
      } else {
        await create({
          fieldName: form.fieldName,
          fieldKey: form.fieldKey,
          fieldType: form.fieldType,
          options,
          isRequired: form.isRequired,
        });
        toast({ title: 'Custom field created' });
      }

      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save custom field';
      toast({ title: message, variant: 'destructive' });
    }
  };

  const handleEdit = (field: CustomFieldDefinition) => {
    setForm({
      fieldName: field.fieldName,
      fieldKey: field.fieldKey,
      fieldType: field.fieldType,
      options: field.options.join(', '),
      isRequired: field.isRequired,
    });
    setEditingId(field.id);
    setShowForm(true);
  };

  const handleDelete = async (fieldId: string) => {
    if (!confirm('Delete this custom field? All contact data for this field will be removed.')) return;
    try {
      await remove(fieldId);
      toast({ title: 'Custom field deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading custom fields...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Custom Fields</h3>
        <Button
          size="sm"
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel' : '+ Add Field'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Field Name</Label>
              <Input
                value={form.fieldName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Company Name"
              />
            </div>
            <div>
              <Label>Field Key</Label>
              <Input
                value={form.fieldKey}
                onChange={(e) => setForm({ ...form, fieldKey: e.target.value })}
                placeholder="e.g., company_name"
                disabled={!!editingId}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Field Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.fieldType}
                onChange={(e) => setForm({ ...form, fieldType: e.target.value as CustomFieldType })}
              >
                {FIELD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                />
                Required field
              </label>
            </div>
          </div>

          {form.fieldType === 'DROPDOWN' && (
            <div>
              <Label>Options (comma-separated)</Label>
              <Input
                value={form.options}
                onChange={(e) => setForm({ ...form, options: e.target.value })}
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isCreating}>
            {editingId ? 'Update Field' : 'Create Field'}
          </Button>
        </Card>
      )}

      {definitions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No custom fields defined. Create one to start tracking extra contact information.
        </p>
      ) : (
        <div className="space-y-2">
          {definitions.map((field) => (
            <Card key={field.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{field.fieldName}</div>
                <div className="text-xs text-muted-foreground">
                  Key: {field.fieldKey} | Type: {field.fieldType}
                  {field.isRequired && ' | Required'}
                  {field.fieldType === 'DROPDOWN' && ` | Options: ${field.options.join(', ')}`}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(field)}>
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => handleDelete(field.id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
