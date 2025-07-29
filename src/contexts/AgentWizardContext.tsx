import React, { createContext, useContext, useState } from 'react';

export interface AgentWizardForm {
  name: string;
  prompt: string;
  llm: string;
  temperature: number;
  voiceId: string;
  language: string;
  modelType: string;
}

interface AgentWizardContextValue {
  form: AgentWizardForm;
  setForm: React.Dispatch<React.SetStateAction<AgentWizardForm>>;
}

const AgentWizardContext = createContext<AgentWizardContextValue | null>(null);

export const AgentWizardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [form, setForm] = useState<AgentWizardForm>({
    name: '',
    prompt: '',
    llm: 'gpt-4o',
    temperature: 0.7,
    voiceId: '',
    language: 'en',
    modelType: 'turbo',
  });

  return (
    <AgentWizardContext.Provider value={{ form, setForm }}>
      {children}
    </AgentWizardContext.Provider>
  );
};

export const useAgentWizard = () => {
  const ctx = useContext(AgentWizardContext);
  if (!ctx) throw new Error('useAgentWizard must be used within AgentWizardProvider');
  return ctx;
};
