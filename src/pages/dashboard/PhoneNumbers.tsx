import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  Plus, 
  X, 
  Loader2, 
  Bot,
  PhoneCall,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  Clock,
  Settings,
  ExternalLink,
  Check,
  Info,
  PhoneOutgoing,
  Link2,
  Copy
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { generateEncryptedLink, decryptLinkConfiguration, type LinkConfiguration } from '../../lib/encryption';

interface Agent {
  agent_id: string;
  name: string;
}

interface PhoneNumber {
  phone_number: string;
  provider: string;
  label: string;
  phone_number_id: string;
  status?: 'active' | 'inactive';
  created_at?: number;
  assigned_agent?: {
    agent_id: string;
    agent_name: string;
  };
}



const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const PhoneNumbers = () => {
  const { getEffectiveUser, getEffectiveUserData, isAdmin, user: originalUser } = useAuth();
  const user = getEffectiveUser();
  const userData = getEffectiveUserData();
  const [isCreating, setIsCreating] = useState(false);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [isOutboundCalling, setIsOutboundCalling] = useState<PhoneNumber | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [formData, setFormData] = useState({
    phone_number: '',
    label: '',
    sid: '',
    token: '',
    termination_uri: '',
  });
  const [assignFormData, setAssignFormData] = useState({
    assigned_agent_id: '',
  });
  const [outboundCallData, setOutboundCallData] = useState({
    to_number: '',
  });
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [importType, setImportType] = useState<'twilio' | 'sip_trunk'>('twilio'); // Added importType state
  const [copiedLinks, setCopiedLinks] = useState<Record<string, boolean>>({});

  const fetchAgents = async () => {
    if (!user) return;

    try {
      setLoadingAgents(true);
      const response = await fetch(`${BACKEND_URL}/agents/${user.uid}`, {
        headers: {
          Authorization: `Bearer ${await originalUser.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      const data = await response.json();
      setAgents(data.agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoadingAgents(false);
    }
  };

  const fetchPhoneNumbers = async () => {
    if (!user) return;

    try {
      setLoadingNumbers(true);
      const response = await fetch(`${BACKEND_URL}/phone-numbers/${user.uid}`, {
        headers: {
          Authorization: `Bearer ${await originalUser.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers');
      }

      const data = await response.json();
      setPhoneNumbers(data);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    } finally {
      setLoadingNumbers(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumbers();
    fetchAgents();
  }, [user]);

  const handleCreatePhoneNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      let requestBody: any = {
        user_id: user.uid,
        provider: importType,
        label: formData.label,
      };

      if (importType === 'twilio') {
        requestBody = {
          ...requestBody,
          phone_number: formData.phone_number,
          sid: formData.sid,
          token: formData.token,
        };
      } else if (importType === 'sip_trunk') {
        requestBody = {
          ...requestBody,
          phone_number: formData.phone_number,

          termination_uri: formData.termination_uri,
        };
      }

      const response = await fetch(`${BACKEND_URL}/phone-numbers/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await originalUser.getIdToken()}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to create phone number');
      }

      setIsCreating(false);
      setFormData({
        phone_number: '',
        label: '',
        sid: '',
        token: '',
        sip_uri: '',
        sip_username: '',
        sip_password: '',
        sip_domain: '',
      });

      await fetchPhoneNumbers();
    } catch (error) {
      console.error('Error creating phone number:', error);
      setError('Failed to create phone number. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAssigning) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${BACKEND_URL}/phone-numbers/${user.uid}/${isAssigning}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await originalUser.getIdToken()}`,
          },
          body: JSON.stringify({
            agent_id: assignFormData.assigned_agent_id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to assign agent');
      }

      setIsAssigning(null);
      setAssignFormData({
        assigned_agent_id: '',
      });

      await fetchPhoneNumbers();
    } catch (error) {
      console.error('Error assigning agent:', error);
      setError('Failed to assign agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOutboundCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isOutboundCalling || !isOutboundCalling.assigned_agent) return;

    try {
      setLoading(true);
      setError('');

      const endpoint = isOutboundCalling.provider === 'twilio' 
        ? '/call/twilio-outbound'
        : '/call/sip-trunk-outbound';

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await originalUser.getIdToken()}`,
        },
        body: JSON.stringify({
          agentId: isOutboundCalling.assigned_agent.agent_id,
          agent_phone_number_id: isOutboundCalling.phone_number_id,
          to_number: outboundCallData.to_number,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate outbound call');
      }

      setIsOutboundCalling(null);
      setOutboundCallData({ to_number: '' });
    } catch (error) {
      console.error('Error initiating outbound call:', error);
      setError('Failed to initiate outbound call. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateLink = (number: PhoneNumber): string => {
    if (!number.assigned_agent) return '';

    const linkConfiguration: LinkConfiguration = {
      agent_id: number.assigned_agent.agent_id,
      agent_phone_number_id: number.phone_number_id,
    };

    return generateEncryptedLink(linkConfiguration);
  };

  const copyLink = async (phoneNumberId: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinks({ ...copiedLinks, [phoneNumberId]: true });
      setTimeout(() => {
        setCopiedLinks(prev => ({ ...prev, [phoneNumberId]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };



  const filteredNumbers = phoneNumbers.filter((number) => {
    const matchesSearch = 
      number.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      number.phone_number.includes(searchQuery);
    const matchesStatus = filterStatus === 'all' || number.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            Phone Numbers
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your Twilio phone numbers and agent assignments
          </p>
        </div>
        <div>
        <button
            onClick={() => {
              setIsCreating(true);
              setImportType('twilio');
            }}
            className="btn btn-primary mr-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Import from Twilio
          </button>
          <button
            onClick={() => {
              setIsCreating(true);
              setImportType('sip_trunk');
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Import from SIP
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phone numbers..."
              className="input input-with-icon pl-10"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2.5 text-sm rounded-lg border transition-colors",
                filterStatus !== 'all'
                  ? 'border-primary bg-primary-50/50 text-primary dark:border-primary-400 dark:bg-primary-400/10 dark:text-primary-400'
                  : 'border-gray-200 dark:border-dark-100 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-dark-50'
              )}
            >
              <Filter className="w-4 h-4" />
              <span>
                {filterStatus === 'all' 
                  ? 'All Status' 
                  : filterStatus === 'active' 
                    ? 'Active' 
                    : 'Inactive'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-30"
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-200 rounded-lg shadow-lg border border-gray-100 dark:border-dark-100 overflow-hidden z-40"
                  >
                    <button
                      onClick={() => {
                        setFilterStatus('all');
                        setIsFilterOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center space-x-2 px-4 py-2.5 text-sm transition-colors",
                        filterStatus === 'all'
                          ? 'bg-primary-50/50 text-primary dark:bg-primary-400/10 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-100'
                      )}
                    >
                      <Filter className="w-4 h-4" />
                      <span>All Status</span>
                    </button>
                    <button
                      onClick={() => {
                        setFilterStatus('active');
                        setIsFilterOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center space-x-2 px-4 py-2.5 text-sm transition-colors",
                        filterStatus === 'active'
                          ? 'bg-primary-50/50 text-primary dark:bg-primary-400/10 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-100'
                      )}
                    >
                      <Check className="w-4 h-4" />
                      <span>Active</span>
                    </button>
                    <button
                      onClick={() => {
                        setFilterStatus('inactive');
                        setIsFilterOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center space-x-2 px-4 py-2.5 text-sm transition-colors",
                        filterStatus === 'inactive'
                          ? 'bg-primary-50/50 text-primary dark:bg-primary-400/10 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-100'
                      )}
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Inactive</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-100">
                <div className="flex items-center space-x-2">
                  <Phone className="w-6 h-6 text-primary dark:text-primary-400" />
                  <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                    {importType === 'twilio' ? 'Import Twilio Phone Number' : 'Import SIP Phone Number'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
              {importType === 'twilio' ? (
                <>
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Before you begin
                      </h3>
                      <p className="text-sm text-blue-600 dark:text-blue-300">
                        Make sure you have:
                      </p>
                      <ul className="mt-2 text-sm text-blue-600 dark:text-blue-300 space-y-1">
                        <li className="flex items-center space-x-2">
                          <span className="w-1 h-1 rounded-full bg-blue-400 dark:bg-blue-300" />
                          <span>An active Twilio account</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <span className="w-1 h-1 rounded-full bg-blue-400 dark:bg-blue-300" />
                          <span>A purchased phone number</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <span className="w-1 h-1 rounded-full bg-blue-400 dark:bg-blue-300" />
                          <span>Your Account SID and Auth Token</span>
                        </li>
                      </ul>
                      <a
                        href="https://www.twilio.com/console"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-sm text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-2"
                      >
                        <span>Visit Twilio Console</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreatePhoneNumber} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label
                      htmlFor="phone_number"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) =>
                        setFormData({ ...formData, phone_number: e.target.value })
                      }
                      placeholder="+1234567890"
                      className="input"
                      required
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Enter the phone number in E.164 format (e.g., +1234567890)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="label"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Label
                    </label>
                    <input
                      type="text"
                      id="label"
                      value={formData.label}
                      onChange={(e) =>
                        setFormData({ ...formData, label: e.target.value })
                      }
                      placeholder="Support Line"
                      className="input"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="sid"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Twilio Account SID
                    </label>
                    <input
                      type="text"
                      id="sid"
                      value={formData.sid}
                      onChange={(e) =>
                        setFormData({ ...formData, sid: e.target.value })
                      }
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="input font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="token"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Twilio Auth Token
                    </label>
                    <input
                      type="password"
                      id="token"
                      value={formData.token}
                      onChange={(e) =>
                        setFormData({ ...formData, token: e.target.value })
                      }
                      placeholder="Enter your Twilio auth token"
                      className="input font-mono"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-100">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Import Number'
                      )}
                    </button>
                  </div>
                </form>
              </>
              ) : (
                <form onSubmit={handleCreatePhoneNumber} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label
                      htmlFor="label"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Label
                    </label>
                    <input
                      type="text"
                      id="label"
                      value={formData.label}
                      onChange={(e) =>
                        setFormData({ ...formData, label: e.target.value })
                      }
                      placeholder="Support Line"
                      className="input"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="phone_number"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) =>
                        setFormData({ ...formData, phone_number: e.target.value })
                      }
                      placeholder="+1234567890"
                      className="input"
                      required
                    />
                  </div>



                  <div className="space-y-2">
                    <label
                      htmlFor="termination_uri"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Termination URI
                    </label>
                    <input
                      type="text"
                      id="termination_uri"
                      value={formData.termination_uri}
                      onChange={(e) =>
                        setFormData({ ...formData, termination_uri: e.target.value })
                      }
                      placeholder="sip:example.com"
                      className="input"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-100">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Import SIP Number'
                      )}
                    </button>
                  </div>
                </form>
              )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Agent Modal */}
      <AnimatePresence>
        {isAssigning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-2xl w-full"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-100">
                <div className="flex items-center space-x-2">
                  <Bot className="w-6 h-6 text-primary dark:text-primary-400" />
                  <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                    Assign Agent
                  </h2>
                </div>
                <button
                  onClick={() => setIsAssigning(null)}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Inbound calls
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Assign an agent to handle calls to this phone number.
                  </p>
                </div>

                <form onSubmit={handleAssignAgent} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label
                      htmlFor="assign-agent"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Agent
                    </label>
                    <select
                      id="assign-agent"
                      value={assignFormData.assigned_agent_id}
                      onChange={(e) =>
                        setAssignFormData({
                          assigned_agent_id: e.target.value,
                        })
                      }
                      className="input"
                    >
                      <option value="">No agent</option>
                      {agents.map((agent) => (
                        <option key={agent.agent_id} value={agent.agent_id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-100">
                    <button
                      type="button"
                      onClick={() => setIsAssigning(null)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        'Assign Agent'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outbound Call Modal */}
      <AnimatePresence>
        {isOutboundCalling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-2xl w-full"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-100">
                <div className="flex items-center space-x-2">
                  <PhoneOutgoing className="w-6 h-6 text-primary dark:text-primary-400" />
                  <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                    Make Outbound Call
                  </h2>
                </div>
                <button
                  onClick={() => setIsOutboundCalling(null)}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Call Details
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Enter the phone number you want to call.
                  </p>
                </div>

                <form onSubmit={handleOutboundCall} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label
                      htmlFor="to-number"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Phone Number to Call
                    </label>
                    <input
                      type="tel"
                      id="to-number"
                      value={outboundCallData.to_number}
                      onChange={(e) =>
                        setOutboundCallData({
                          to_number: e.target.value,
                        })
                      }
                      placeholder="+1234567890"
                      className="input"
                      required
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Enter the phone number in E.164 format (e.g., +1234567890)
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-100">
                    <button
                      type="button"
                      onClick={() => setIsOutboundCalling(null)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Initiating Call...
                        </>
                      ) : (
                        'Make Call'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Phone Numbers List */}
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
        {loadingNumbers ? (
          <div className="p-8 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-primary-400" />
            <span className="ml-2 text-gray-600 dark:text-gray -400">Loading phone numbers...</span>
          </div>
        ) : filteredNumbers.length === 0 ? (
          <div className="p-8 text-center">
            <Phone className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery || filterStatus !== 'all'
                ? 'No matching phone numbers found'
                : 'No phone numbers yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Import your Twilio phone numbers to start using them with your AI agents'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <button
                onClick={() => setIsCreating(true)}
                className="btn btn-outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Import Your First Number
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-dark-100">
            {filteredNumbers.map((number) => (
              <motion.div
                key={number.phone_number_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
                        <Phone className="w-6 h-6 text-primary dark:text-primary-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-1">
                        {number.label}
                      </h3>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Number:
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-100 px-2 py-1 rounded font-mono">
                            {number.phone_number}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Provider:
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-100 px-2 py-1 rounded capitalize">
                            {number.provider}
                          </span>
                        </div>
                        {number.created_at && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(number.created_at * 1000).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Generated Link */}
                      {number.assigned_agent && number.provider === 'twilio' && (
                        <div className="mt-2 flex items-center space-x-2">
                          <div className="flex items-center space-x-2 bg-green-50/50 dark:bg-green-400/10 px-3 py-1.5 rounded-lg">
                            <Link2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <input
                              type="text"
                              value={generateLink(number)}
                              readOnly
                              className="text-sm bg-transparent border-none outline-none text-green-600 dark:text-green-400 font-mono w-60 truncate"
                            />
                            <button
                              onClick={() => copyLink(number.phone_number_id, generateLink(number))}
                              className="flex items-center space-x-1 px-2 py-1 text-sm font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-400/20 rounded transition-colors"
                            >
                              {copiedLinks[number.phone_number_id] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              <span>{copiedLinks[number.phone_number_id] ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                  <div className="flex items-center space-x-4">
                    {number.assigned_agent ? (
                      <div className="flex items-center space-x-2 bg-primary/5 dark:bg-primary-400/10 px-3 py-2 rounded-lg">
                        <Bot className="w-4 h-4 text-primary dark:text-primary-400" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Assigned Agent
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {number.assigned_agent.agent_name}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 bg-gray-50 dark:bg-dark-100 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          No agent assigned
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(`https://www.twilio.com/console/phone-numbers/${number.phone_number_id}`, '_blank')}
                        className="p-2 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          const selectedNumber = phoneNumbers.find(n => n.phone_number_id === number.phone_number_id);
                          if (selectedNumber) {
                            setAssignFormData({
                              assigned_agent_id: selectedNumber.assigned_agent?.agent_id || '',
                            });
                            setIsAssigning(number.phone_number_id);
                          }
                        }}
                        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 bg-gray-100 dark:bg-dark-100 hover:bg-gray-200 dark:hover:bg-dark-50 rounded-lg transition-colors"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>{number.assigned_agent ? 'Change Agent' : 'Assign Agent'}</span>
                      </button>
                      {number.assigned_agent && (
                        <>
                          <button
                            onClick={() => setIsOutboundCalling(number)}
                            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-primary dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 bg-primary-50/50 dark:bg-primary-400/10 hover:bg-primary-100/50 dark:hover:bg-primary-400/20 rounded-lg transition-colors"
                          >
                            <PhoneOutgoing className="w-4 h-4" />
                            <span>Outbound Call</span>
                          </button>
                        </>
                      )}

                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneNumbers;