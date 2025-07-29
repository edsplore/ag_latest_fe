import React from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { Fragment } from 'react';
import { useAgentWizard } from '../contexts/AgentWizardContext';
import { Loader2 } from 'lucide-react';

interface AgentDrawerProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AgentDrawer: React.FC<AgentDrawerProps> = ({ open, loading, onClose, onSubmit }) => {
  const { form, setForm } = useAgentWizard();
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>
        <div className="fixed inset-0 flex justify-end">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in-out duration-300"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="w-96 max-w-full bg-white h-full shadow-xl flex flex-col">
              <Dialog.Title className="p-4 border-b border-cardborder text-lg font-bold">
                New Agent
              </Dialog.Title>
              <form onSubmit={onSubmit} className="flex-1 overflow-auto">
                <Tab.Group>
                  <Tab.List className="border-b border-cardborder flex space-x-4 px-4">
                    {['Basic', 'Model & Voice', 'Knowledge', 'Review'].map(t => (
                      <Tab key={t} className={({ selected }) => cn('py-2', selected ? 'border-b-2 border-primary text-primary' : '')}>{t}</Tab>
                    ))}
                  </Tab.List>
                  <Tab.Panels className="p-4 space-y-4">
                    <Tab.Panel className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium">Name</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="input"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Prompt</label>
                        <textarea
                          value={form.prompt}
                          onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                          className="input"
                        />
                      </div>
                    </Tab.Panel>
                    <Tab.Panel className="grid md:grid-cols-2 gap-6">Model & Voice</Tab.Panel>
                    <Tab.Panel className="grid md:grid-cols-2 gap-6">Knowledge</Tab.Panel>
                    <Tab.Panel className="grid md:grid-cols-2 gap-6">Review</Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </form>
              <div className="p-4 border-t border-cardborder sticky bottom-0 bg-white" style={{boxShadow:'rgba(16,24,40,0.05) 0 -1px 2px'}}>
                <button
                  type="submit"
                  form=""
                  disabled={loading}
                  className="w-full btn btn-primary"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
