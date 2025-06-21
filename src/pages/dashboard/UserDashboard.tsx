import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { DashboardNavbar } from '../../components/DashboardNavbar';
import Agents from './Agents';
import PhoneNumbers from './PhoneNumbers';
import CallHistory from './CallHistory';
import KnowledgeBase from './KnowledgeBase';
import Tools from './Tools';
import ToolDetails from './ToolDetails';
import BatchCalling from './BatchCalling';

export default function UserDashboard() {

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-dark-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <main className="flex-1 overflow-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard/agents" replace />} />
              <Route path="agents/*" element={<Agents />} />
              <Route path="phones" element={<PhoneNumbers />} />
              <Route path="calls" element={<CallHistory />} />
              <Route path="knowledge" element={<KnowledgeBase />} />
              <Route path="tools" element={<Tools />} />
              <Route path="tools/:toolId" element={<ToolDetails />} />
              <Route path="batch-calling" element={<BatchCalling />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};