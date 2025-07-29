import React, { useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface Agent {
  agent_id: string;
  name: string;
  created_at_unix_secs: number;
}

interface AgentSidebarProps {
  agents: Agent[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (agent: Agent) => void;
  onCreate: () => void;
}

export const AgentSidebar: React.FC<AgentSidebarProps> = ({ agents, loading, selectedId, onSelect, onCreate }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredAgents = useMemo(() => {
    let list = agents;
    if (search) {
      list = list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    }
    // filter status placeholder, since we don't have status field
    return list;
  }, [agents, search]);

  const handleRowClick = (agent: Agent) => {
    onSelect(agent);
  };

  return (
    <aside className="border-r border-cardborder bg-white flex flex-col h-full" ref={containerRef}>
      <div className="p-4 space-y-2">
        <div className="flex space-x-2">
          {['all', 'active', 'inactive'].map(v => (
            <button
              key={v}
              onClick={() => setFilter(v as any)}
              className={cn(
                'px-3 py-1 rounded-full text-sm',
                filter === v ? 'bg-primary text-white' : 'bg-gray-100'
              )}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input"
        />
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading...</div>
        ) : (
          <div style={{minHeight: '100%'}}>
            {filteredAgents.map(agent => (
              <div
                key={agent.agent_id}
                onClick={() => handleRowClick(agent)}
                className={cn(
                  'flex items-center justify-between px-4 h-12 cursor-pointer hover:bg-slate-50 transition',
                  selectedId === agent.agent_id && 'bg-slate-50'
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-md bg-gradient-to-br from-primary to-primary-600" />
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(agent.created_at_unix_secs * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-4 border-t border-cardborder sticky bottom-0 bg-white shadow" style={{boxShadow:'rgba(16,24,40,0.05) 0 1px 2px'}}>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="font-bold">{agents.length}</p>
            <p className="text-gray-500">Agents</p>
          </div>
          <div>
            <p className="font-bold">0</p>
            <p className="text-gray-500">Calls</p>
          </div>
          <div>
            <p className="font-bold">0</p>
            <p className="text-gray-500">Usage</p>
          </div>
        </div>
        <button onClick={onCreate} className="mt-4 w-full btn btn-primary text-sm">Create Agent</button>
      </div>
    </aside>
  );
};
