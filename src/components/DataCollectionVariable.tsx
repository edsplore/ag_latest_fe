import React, { useState, useEffect } from 'react';
import { Database, Edit, Trash2, Check, X } from 'lucide-react';

interface DynamicVariable {
  type: string;
  description?: string;
  dynamic_variable?: string;
  constant_value?: string;
  constant_value_type?: string;
}

interface Props {
  varName: string;
  varConfig: DynamicVariable;
  editingVarName: string | null;
  editingVarValue: string;
  onEdit: (name: string, value: string) => void;
  onSave: (oldName: string, newName: string) => void;
  onCancel: () => void;
  onDelete: (name: string) => void;
  onChange: (name: string, config: DynamicVariable) => void;
}

export const DataCollectionVariable: React.FC<Props> = ({
  varName,
  varConfig,
  editingVarName,
  editingVarValue,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onChange,
}) => {
  const [variableType, setVariableType] = useState<'description' | 'constant' | 'dynamic'>('description');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (varConfig.constant_value && varConfig.constant_value !== '') {
      setVariableType('constant');
    } else if (varConfig.dynamic_variable && varConfig.dynamic_variable !== '') {
      setVariableType('dynamic');
    } else if (varConfig.description && varConfig.description !== '') {
      setVariableType('description');
    } else if (varConfig.constant_value !== undefined) {
      setVariableType('constant');
    } else if (varConfig.dynamic_variable !== undefined) {
      setVariableType('dynamic');
    } else {
      setVariableType('description');
    }
  }, [varConfig]);

  const handleVariableTypeChange = (newType: 'description' | 'constant' | 'dynamic') => {
    setVariableType(newType);
    const newConfig = { type: varConfig.type } as DynamicVariable;
    if (newType === 'description') {
      newConfig.description = varConfig.description || '';
    } else if (newType === 'constant') {
      newConfig.constant_value = varConfig.constant_value || '';
      newConfig.constant_value_type = varConfig.constant_value_type || 'string';
    } else if (newType === 'dynamic') {
      newConfig.dynamic_variable = varConfig.dynamic_variable || '';
    }
    onChange(varName, newConfig);
  };

  // Validation function to check if current variable type has a value
  const isVariableValid = () => {
    if (variableType === 'description') {
      return varConfig.description && varConfig.description.trim() !== '';
    } else if (variableType === 'constant') {
      return varConfig.constant_value && varConfig.constant_value.trim() !== '';
    } else if (variableType === 'dynamic') {
      return varConfig.dynamic_variable && varConfig.dynamic_variable.trim() !== '';
    }
    return false;
  };

  // Get validation message for display
  const getValidationMessage = () => {
    if (variableType === 'description' && (!varConfig.description || !varConfig.description.trim())) {
      return 'Description is required';
    } else if (variableType === 'constant' && (!varConfig.constant_value || !varConfig.constant_value.trim())) {
      return 'Constant value is required';
    } else if (variableType === 'dynamic' && (!varConfig.dynamic_variable || !varConfig.dynamic_variable.trim())) {
      return 'Dynamic variable is required';
    }
    return null;
  };

  const validationMessage = getValidationMessage();
  const hasValidationError = !isVariableValid();

  return (
    <div className={`p-4 bg-white dark:bg-dark-200 rounded-lg shadow-sm border transition-colors ${
      hasValidationError 
        ? 'border-red-300 dark:border-red-500 bg-red-50/30 dark:bg-red-500/5' 
        : 'border-gray-200 dark:border-dark-100'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            hasValidationError
              ? 'bg-gradient-to-br from-red-500/20 to-red-500/10 dark:from-red-500/30 dark:to-red-500/20'
              : 'bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20'
          }`}>
            <Database className={`w-5 h-5 transition-colors ${
              hasValidationError 
                ? 'text-red-500 dark:text-red-400' 
                : 'text-primary dark:text-primary-400'
            }`} />
          </div>
          <div className="flex flex-col">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingVarName === varName ? editingVarValue : varName}
                  onChange={(e) => onEdit(varName, e.target.value)}
                  className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border border-primary rounded-md px-2 py-1 focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => onSave(varName, editingVarName === varName ? editingVarValue : varName)}
                  disabled={!isVariableValid()}
                  className={`p-1 transition-colors ${
                    isVariableValid() 
                      ? 'text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300' 
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    onCancel();
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {varName}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {varConfig.type} - {variableType}
                </span>
                {hasValidationError && (
                  <span className="text-xs text-red-500 dark:text-red-400 mt-1">
                    {validationMessage}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setIsEditing(!isEditing);
              if (!isEditing) {
                onEdit(varName, varName);
              }
            }}
            className="p-2 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary-400 rounded-lg hover:bg-primary-50/50 dark:hover:bg-primary-400/10 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(varName)}
            className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-100 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={varConfig.type}
              onChange={(e) => onChange(varName, { ...varConfig, type: e.target.value })}
              className="input text-sm"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="integer">Integer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Variable Type
            </label>
            <select
              value={variableType}
              onChange={(e) => handleVariableTypeChange(e.target.value as 'description' | 'constant' | 'dynamic')}
              className="input text-sm"
            >
              <option value="description">Description</option>
              <option value="constant">Constant Value</option>
              <option value="dynamic">Dynamic Variable</option>
            </select>
          </div>

          {variableType === 'description' && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={varConfig.description || ''}
                onChange={(e) => onChange(varName, { ...varConfig, description: e.target.value })}
                className={`input text-sm ${
                  !varConfig.description?.trim() 
                    ? 'border-red-300 dark:border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : ''
                }`}
                placeholder="Enter description"
                required
              />
              {!varConfig.description?.trim() && (
                <p className="text-xs text-red-500 mt-1">Description is required</p>
              )}
            </div>
          )}

          {variableType === 'constant' && (
            <>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Constant Value Type
                </label>
                <select
                  value={varConfig.constant_value_type || 'string'}
                  onChange={(e) => onChange(varName, { ...varConfig, constant_value_type: e.target.value, constant_value: '' })}
                  className="input text-sm"
                >
                  <option value="string">String</option>
                  <option value="integer">Integer</option>
                  <option value="double">Double</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Constant Value <span className="text-red-500">*</span>
                </label>
                {varConfig.constant_value_type === 'boolean' ? (
                  <select
                    value={varConfig.constant_value || 'true'}
                    onChange={(e) => onChange(varName, { ...varConfig, constant_value: e.target.value })}
                    className="input text-sm"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    type={varConfig.constant_value_type === 'integer' || varConfig.constant_value_type === 'double' ? 'number' : 'text'}
                    step={varConfig.constant_value_type === 'double' ? '0.01' : '1'}
                    value={varConfig.constant_value || ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (varConfig.constant_value_type === 'integer') {
                        value = parseInt(value) ? String(parseInt(value)) : '';
                      } else if (varConfig.constant_value_type === 'double') {
                        value = parseFloat(value) ? String(parseFloat(value)) : '';
                      }
                      onChange(varName, { ...varConfig, constant_value: value });
                    }}
                    className={`input text-sm ${
                      !varConfig.constant_value?.trim() 
                        ? 'border-red-300 dark:border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : ''
                    }`}
                    placeholder={`Enter ${varConfig.constant_value_type} value`}
                    required
                  />
                )}
                {varConfig.constant_value_type !== 'boolean' && !varConfig.constant_value?.trim() && (
                  <p className="text-xs text-red-500 mt-1">Constant value is required</p>
                )}
              </div>
            </>
          )}

          {variableType === 'dynamic' && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dynamic Variable <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={varConfig.dynamic_variable || ''}
                onChange={(e) => onChange(varName, { ...varConfig, dynamic_variable: e.target.value })}
                className={`input text-sm ${
                  !varConfig.dynamic_variable?.trim() 
                    ? 'border-red-300 dark:border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : ''
                }`}
                placeholder="Enter dynamic variable"
                required
              />
              {!varConfig.dynamic_variable?.trim() && (
                <p className="text-xs text-red-500 mt-1">Dynamic variable is required</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};