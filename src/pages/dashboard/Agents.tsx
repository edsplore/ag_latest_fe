import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AgentSidebar } from '../../components/AgentSidebar';
import { AgentDrawer } from '../../components/AgentDrawer';
import { AgentDetailsPanel } from '../../components/AgentDetailsPanel';
import { AgentWizardProvider } from '../../contexts/AgentWizardContext';

interface Agent {
  agent_id: string;
  name: string;
  created_at_unix_secs: number;
}

interface AgentListResponse {
  agents: Agent[];
  has_more: boolean;
  next_cursor: string | null;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const AgentsPage = () => {
  const { getEffectiveUser } = useAuth();
  const user = getEffectiveUser();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Agent | null>(null);

  const fetchAgents = async () => {
    if (!user) return;
    try {
      setLoadingAgents(true);
      const res = await fetch(`${BACKEND_URL}/agents/${user.uid}`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      if (!res.ok) throw new Error('failed');
      const data: AgentListResponse = await res.json();
      setAgents(data.agents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSaving(true);
      // payload building omitted for brevity
      await fetchAgents();
      setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AgentWizardProvider>
      <div className="h-[calc(100vh-56px)] grid grid-cols-[300px_1fr]">
        <AgentSidebar
          agents={agents}
          loading={loadingAgents}
          selectedId={selected?.agent_id || null}
          onSelect={setSelected}
          onCreate={() => setDrawerOpen(true)}
        />
        <main className="p-6 overflow-auto bg-canvas">
          {selected ? (
            <AgentDetailsPanel agent={selected} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select an agent
            </div>
          )}
        </main>
        <AgentDrawer open={drawerOpen} loading={saving} onClose={() => setDrawerOpen(false)} onSubmit={handleCreate} />
      </div>
    </AgentWizardProvider>
  );
};

export default AgentsPage;
