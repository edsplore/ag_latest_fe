
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Phone, 
  History, 
  Database,
  ArrowRight,
  Activity,
  Users,
  Clock,
  MessageSquare,
  BarChart,
  TrendingUp,
  PhoneCall,
  Plus,
  Webhook
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/Sidebar';
import { DashboardNavbar } from '../../components/DashboardNavbar';
import Agents from './Agents';
import PhoneNumbers from './PhoneNumbers';
import CallHistory from './CallHistory';
import KnowledgeBase from './KnowledgeBase';
import Tools from './Tools';
import ToolDetails from './ToolDetails';
import BatchCalling from './BatchCalling';
import UserManagement from './UserManagement';
import { Link } from 'react-router-dom';

const quickActions = [
  {
    title: 'Create Agent',
    description: 'Set up a new AI agent for your business',
    icon: Bot,
    path: '/dashboard/agents',
    color: 'primary'
  },
  {
    title: 'Import Phone Number',
    description: 'Connect your Twilio phone number',
    icon: Phone,
    path: '/dashboard/phones',
    color: 'indigo'
  },
  {
    title: 'Add Knowledge',
    description: 'Upload documents or add URLs',
    icon: Database,
    path: '/dashboard/knowledge',
    color: 'rose'
  }
];

const stats = [
  {
    title: 'Total Agents',
    value: '12',
    change: '+2',
    trend: 'up',
    icon: Users,
    color: 'primary'
  },
  {
    title: 'Active Calls',
    value: '28',
    change: '+5',
    trend: 'up',
    icon: PhoneCall,
    color: 'indigo'
  },
  {
    title: 'Avg. Call Duration',
    value: '4m 32s',
    change: '-12s',
    trend: 'down',
    icon: Clock,
    color: 'rose'
  },
  {
    title: 'Messages Today',
    value: '1,284',
    change: '+18%',
    trend: 'up',
    icon: MessageSquare,
    color: 'amber'
  }
];

const recentActivity = [
  {
    type: 'call',
    agent: 'Support Agent',
    time: '2 minutes ago',
    duration: '5:23',
    status: 'completed'
  },
  {
    type: 'agent',
    name: 'Sales Bot',
    time: '15 minutes ago',
    action: 'created'
  },
  {
    type: 'knowledge',
    name: 'Product Manual.pdf',
    time: '1 hour ago',
    action: 'uploaded'
  },
  {
    type: 'call',
    agent: 'Sales Agent',
    time: '2 hours ago',
    duration: '3:45',
    status: 'completed'
  }
];

const AdminDashboardHome = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your organization's AI agents and settings
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-primary-50/50 dark:bg-primary-900/20 px-4 py-2 rounded-lg">
              <Activity className="w-4 h-4 text-primary dark:text-primary-400" />
              <span className="text-sm font-medium text-primary dark:text-primary-400">
                System Status: Operational
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative group"
          >
            <div className={`absolute inset-0 bg-gradient-to-r from-${action.color}/5 to-${action.color}/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 -z-10 blur-xl`} />
            <Link
              to={action.path}
              className="block bg-white dark:bg-dark-200 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 hover:shadow-md transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${action.color}/20 to-${action.color}/10 dark:from-${action.color}/30 dark:to-${action.color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className={`w-6 h-6 text-${action.color}`} />
              </div>
              <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-2">
                {action.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {action.description}
              </p>
              <div className="mt-4 flex items-center text-primary dark:text-primary-400">
                <span className="text-sm font-medium">Get Started</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${stat.color}/20 to-${stat.color}/10 dark:from-${stat.color}/30 dark:to-${stat.color}/20 flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className={`w-4 h-4 ${stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.title}
              </h3>
              <p className="text-2xl font-heading font-bold text-gray-900 dark:text-white mt-1">
                {stat.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-dark-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-primary dark:text-primary-400" />
              <h2 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                Recent Activity
              </h2>
            </div>
            <Link
              to="/dashboard/calls"
              className="text-sm text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 flex items-center"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-dark-100">
          {recentActivity.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="p-4 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
                  {activity.type === 'call' ? (
                    <PhoneCall className="w-5 h-5 text-primary dark:text-primary-400" />
                  ) : activity.type === 'agent' ? (
                    <Bot className="w-5 h-5 text-primary dark:text-primary-400" />
                  ) : (
                    <Database className="w-5 h-5 text-primary dark:text-primary-400" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.type === 'call' ? (
                        <>Call with {activity.agent}</>
                      ) : activity.type === 'agent' ? (
                        <>Agent {activity.name} {activity.action}</>
                      ) : (
                        <>Document {activity.name} {activity.action}</>
                      )}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.time}
                    </span>
                  </div>
                  {activity.type === 'call' && (
                    <div className="flex items-center mt-1 space-x-4">
                      <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{activity.duration}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-emerald-500 capitalize">
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  return (
    <div className="h-screen flex bg-gray-50 dark:bg-dark-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <main className="flex-1 overflow-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<AdminDashboardHome />} />
              <Route path="agents/*" element={<Agents />} />
              <Route path="phones" element={<PhoneNumbers />} />
              <Route path="calls" element={<CallHistory />} />
              <Route path="knowledge" element={<KnowledgeBase />} />
              <Route path="tools" element={<Tools />} />
              <Route path="tools/:toolId" element={<ToolDetails />} />
              <Route path="batch-calling" element={<BatchCalling />} />
              <Route path="users" element={<UserManagement />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
