import api from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'CHECKBOX';

export interface CustomFieldDefinition {
  id: string;
  workspaceId: string;
  fieldName: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  options: string[];
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ContactCustomFieldValue {
  definition: CustomFieldDefinition;
  value: unknown;
}

export interface CreateCustomFieldDto {
  fieldName: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
}

export interface UpdateCustomFieldDto {
  fieldName?: string;
  fieldType?: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
}

// ===========================================
// API Methods
// ===========================================

export const customFieldsService = {
  /** Get all custom field definitions for the workspace */
  getDefinitions: async (): Promise<CustomFieldDefinition[]> => {
    return api.get('/contacts/custom-fields/definitions');
  },

  /** Create a new custom field definition */
  createDefinition: async (dto: CreateCustomFieldDto): Promise<CustomFieldDefinition> => {
    return api.post('/contacts/custom-fields/definitions', dto);
  },

  /** Update a custom field definition */
  updateDefinition: async (
    fieldId: string,
    dto: UpdateCustomFieldDto,
  ): Promise<CustomFieldDefinition> => {
    return api.put(`/contacts/custom-fields/definitions/${fieldId}`, dto);
  },

  /** Delete a custom field definition */
  deleteDefinition: async (fieldId: string): Promise<{ deleted: boolean; contactsCleaned: number }> => {
    return api.delete(`/contacts/custom-fields/definitions/${fieldId}`);
  },

  /** Reorder custom field definitions */
  reorderDefinitions: async (fieldIds: string[]): Promise<CustomFieldDefinition[]> => {
    return api.post('/contacts/custom-fields/definitions/reorder', { fieldIds });
  },

  /** Get custom field values for a contact */
  getContactValues: async (contactId: string): Promise<ContactCustomFieldValue[]> => {
    return api.get(`/contacts/${contactId}/custom-fields`);
  },

  /** Set custom field values for a contact */
  setContactValues: async (
    contactId: string,
    fields: Record<string, unknown>,
  ): Promise<unknown> => {
    return api.put(`/contacts/${contactId}/custom-fields`, { fields });
  },
};
