import React from 'react';

interface Agent {
  agent_id: string;
  name: string;
  created_at_unix_secs: number;
}

export const AgentDetailsPanel: React.FC<{ agent: Agent }> = ({ agent }) => {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="card p-4">
        <h2 className="font-bold mb-2">At-a-glance</h2>
        <p className="text-sm">Name: {agent.name}</p>
      </div>
      <div className="card p-4">Settings</div>
      <div className="card p-4">Live Test</div>
    </div>
  );
};
