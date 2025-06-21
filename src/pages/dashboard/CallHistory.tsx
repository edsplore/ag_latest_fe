import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MessageSquare,
  X,
  Play,
  Pause,
  Download,
  BarChart,
  Search,
  Activity,
  User,
  ChevronDown,
  Volume2,
  Phone,
  Calendar,
  Copy,
  Check,
  Database,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Loader, PageLoader } from "../../components/Loader";

interface Conversation {
  agent_id: string;
  agent_name: string;
  conversation_id: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  message_count: number;
  status: string;
  call_successful: string;
}

interface ConversationDetails {
  conversation: {
    agent_id: string;
    conversation_id: string;
    status: string;
    transcript: {
      role: string;
      message: string;
      time_in_call_secs: number;
    }[];
    metadata: {
      start_time_unix_secs: number;
      call_duration_secs: number;
      call_duration_secs: number;
    };
    analysis: {
      call_successful: string;
      transcript_summary: string;
    };
  };
  audio: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Data Collection Section Component
const DataCollectionSection = ({ dataCollection }: { dataCollection: any }) => {
  const [showFullDetails, setShowFullDetails] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Database className="w-4 h-4 text-primary dark:text-primary-400" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Data Collection Results
        </h3>
      </div>
      <div className="space-y-3">
        {Object.entries(dataCollection).map(([key, value]: [string, any]) => (
          <div
            key={key}
            className="p-4 bg-gray-50 dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-dark-100"
          >
            <div className="space-y-3">
              {/* Default view - showing data_collection_id and value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {value.data_collection_id && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Collection ID
                    </span>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">
                      {value.data_collection_id}
                    </p>
                  </div>
                )}
                {value.value !== undefined && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Value
                    </span>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {typeof value.value === 'object' 
                        ? JSON.stringify(value.value, null, 2)
                        : String(value.value)
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Show/Hide Full Details Button */}
              <button
                onClick={() => 
                  setShowFullDetails(showFullDetails === key ? null : key)
                }
                className="flex items-center space-x-2 text-primary dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors text-sm font-medium"
              >
                {showFullDetails === key ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Hide Details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>Show Full Details</span>
                  </>
                )}
              </button>

              {/* Full Details - Collapsible */}
              <AnimatePresence>
                {showFullDetails === key && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 border-t border-gray-200 dark:border-dark-100">
                      <pre className="text-xs bg-gray-100 dark:bg-dark-200 p-3 rounded-lg overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CallHistory = () => {
  const { getEffectiveUser, getEffectiveUserData, isAdmin } = useAuth();
  const user = getEffectiveUser();
  const userData = getEffectiveUserData();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [dateAfter, setDateAfter] = useState<string>('');
  const [dateBefore, setDateBefore] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/list-conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          user_id: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchConversationDetails(selectedConversation);
    } else {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        setAudio(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
    }
  }, [selectedConversation]);

  const handlePlayAudio = () => {
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleDownloadAudio = () => {
    if (!conversationDetails?.audio) return;

    const link = document.createElement("a");
    link.href = `data:audio/wav;base64,${conversationDetails.audio}`;
    link.download = `conversation-${selectedConversation}.wav`;
    link.click();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = (text: string, conversationId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(conversationId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Helper function to get unique agents
  const getUniqueAgents = () => {
    const agents = conversations.reduce((acc, conv) => {
      if (!acc.find(a => a.id === conv.agent_id)) {
        acc.push({ id: conv.agent_id, name: conv.agent_name });
      }
      return acc;
    }, [] as { id: string; name: string }[]);
    return agents.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Helper function to remove filter
  const removeFilter = (filterType: string) => {
    switch (filterType) {
      case 'dateAfter':
        setDateAfter('');
        break;
      case 'dateBefore':
        setDateBefore('');
        break;
      case 'agent':
        setSelectedAgent('');
        break;
      case 'evaluation':
        setSelectedEvaluation('');
        break;
    }
  };

  // Update active filters when filters change
  useEffect(() => {
    const filters = [];
    if (dateAfter) filters.push('dateAfter');
    if (dateBefore) filters.push('dateBefore');
    if (selectedAgent) filters.push('agent');
    if (selectedEvaluation) filters.push('evaluation');
    setActiveFilters(filters);
  }, [dateAfter, dateBefore, selectedAgent, selectedEvaluation]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
            Positive
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            Negative
          </span>
        );
      case "unknown":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
            Unknown
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
            Unknown
          </span>
        );
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const filteredConversations = conversations
    .filter((conversation) => {
      // Search filter - search in agent name, agent ID, and conversation ID
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        conversation.agent_name.toLowerCase().includes(searchLower) ||
        conversation.agent_id.toLowerCase().includes(searchLower) ||
        conversation.conversation_id.toLowerCase().includes(searchLower);

      // Date after filter
      const matchesDateAfter = !dateAfter || 
        conversation.start_time_unix_secs >= new Date(dateAfter).getTime() / 1000;

      // Date before filter
      const matchesDateBefore = !dateBefore || 
        conversation.start_time_unix_secs <= new Date(dateBefore).getTime() / 1000;

      // Agent filter
      const matchesAgent = !selectedAgent || conversation.agent_id === selectedAgent;

      // Evaluation filter
      const matchesEvaluation = !selectedEvaluation || conversation.call_successful === selectedEvaluation;

      return matchesSearch && matchesDateAfter && matchesDateBefore && matchesAgent && matchesEvaluation;
    })
    .sort((a, b) => {
      if (sortOrder === 'latest') {
        return b.start_time_unix_secs - a.start_time_unix_secs;
      } else {
        return a.start_time_unix_secs - b.start_time_unix_secs;
      }
    });

  if (loading) {
    return <PageLoader />;
  }

  const fetchCalls = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const response = await fetch(`${BACKEND_URL}/list-conversations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await user.getIdToken()}`,
                },
                body: JSON.stringify({
                    user_id: user.uid,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch conversations");
            }

            const data = await response.json();
            setConversations(data.conversations);
        } catch (error) {
            console.error("Error fetching conversations:", error);
        } finally {
            setLoading(false);
        }
    };

    const effectiveUser = getEffectiveUser();
    useEffect(() => {
        fetchCalls();
    }, []);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
              Call History
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View and analyze your conversation history
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-dark-100 px-4 py-2 rounded-lg">
              <BarChart className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {conversations.length} Total Calls
              </span>
            </div>
            {(searchQuery || activeFilters.length > 0) && (
              <div className="flex items-center space-x-2 bg-primary-50 dark:bg-primary-400/10 px-4 py-2 rounded-lg">
                <Search className="w-4 h-4 text-primary dark:text-primary-400" />
                <span className="text-sm font-medium text-primary dark:text-primary-400">
                  {filteredConversations.length} Filtered Results
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Tags */}
        <div className="mt-6 space-y-3">
          {/* Filter Buttons */}
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            {/* Date After Filter */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Date After
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="date"
                  value={dateAfter}
                  onChange={(e) => setDateAfter(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-dark-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {dateAfter && (
                  <button
                    onClick={() => removeFilter('dateAfter')}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Date Before Filter */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Date Before
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="date"
                  value={dateBefore}
                  onChange={(e) => setDateBefore(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-dark-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {dateBefore && (
                  <button
                    onClick={() => removeFilter('dateBefore')}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>


            {/* Agent Filter */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Agent
              </label>
              <div className="flex items-center space-x-1">
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-dark-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Agents</option>
                  {getUniqueAgents().map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                {selectedAgent && (
                  <button
                    onClick={() => removeFilter('agent')}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Sentiment Analysis Filter */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Sentiment
              </label>
              <div className="flex items-center space-x-1">
                <select
                  value={selectedEvaluation}
                  onChange={(e) => setSelectedEvaluation(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-dark-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Sentiments</option>
                  <option value="success">Positive</option>
                  <option value="failed">Negative</option>
                  <option value="unknown">Unknown</option>
                </select>
                {selectedEvaluation && (
                  <button
                    onClick={() => removeFilter('evaluation')}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">Active filters:</span>
              {dateAfter && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-primary-50 text-primary-700 dark:bg-primary-400/10 dark:text-primary-400 rounded-full">
                  <span>After {new Date(dateAfter).toLocaleDateString()}</span>
                  <button onClick={() => removeFilter('dateAfter')} className="hover:text-primary-800 dark:hover:text-primary-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {dateBefore && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-primary-50 text-primary-700 dark:bg-primary-400/10 dark:text-primary-400 rounded-full">
                  <span>Before {new Date(dateBefore).toLocaleDateString()}</span>
                  <button onClick={() => removeFilter('dateBefore')} className="hover:text-primary-800 dark:hover:text-primary-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedAgent && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-primary-50 text-primary-700 dark:bg-primary-400/10 dark:text-primary-400 rounded-full">
                  <span>{getUniqueAgents().find(a => a.id === selectedAgent)?.name}</span>
                  <button onClick={() => removeFilter('agent')} className="hover:text-primary-800 dark:hover:text-primary-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedEvaluation && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-primary-50 text-primary-700 dark:bg-primary-400/10 dark:text-primary-400 rounded-full">
                  <span>{selectedEvaluation === 'success' ? 'Positive' : selectedEvaluation === 'failed' ? 'Negative' : 'Unknown'}</span>
                  <button onClick={() => removeFilter('evaluation')} className="hover:text-primary-800 dark:hover:text-primary-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by agent name, agent ID, or conversation ID..."
              className="input input-with-icon pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-2">
              No conversations found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || activeFilters.length > 0
                ? "Try adjusting your search or filters"
                : "Start a conversation with one of your agents to see the history here"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-100 border-b border-gray-200 dark:border-dark-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="relative">
                      <button
                        onClick={() => setIsSortOpen(!isSortOpen)}
                        className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Date</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isSortOpen && (
                          <>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-30"
                              onClick={() => setIsSortOpen(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute left-0 mt-2 w-40 bg-white dark:bg-dark-200 rounded-lg shadow-lg border border-gray-100 dark:border-dark-100 overflow-hidden z-40"
                            >
                              <button
                                onClick={() => {
                                  setSortOrder('latest');
                                  setIsSortOpen(false);
                                }}
                                className={`w-full flex items-center space-x-2 px-4 py-2.5 text-sm transition-colors ${
                                  sortOrder === 'latest'
                                    ? "bg-primary-50/50 text-primary dark:bg-primary-400/10 dark:text-primary-400"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-100"
                                }`}
                              >
                                <span>Latest First</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSortOrder('oldest');
                                  setIsSortOpen(false);
                                }}
                                className={`w-full flex items-center space-x-2 px-4 py-2.5 text-sm transition-colors ${
                                  sortOrder === 'oldest'
                                    ? "bg-primary-50/50 text-primary dark:bg-primary-400/10 dark:text-primary-400"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-100"
                                }`}
                              >
                                <span>Oldest First</span>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sentiment Analysis
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
                {filteredConversations.map((conversation) => (
                  <motion.tr
                    key={conversation.conversation_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() =>
                      setSelectedConversation(conversation.conversation_id)
                    }
                    className="hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(conversation.start_time_unix_secs)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {conversation.agent_name}
                        </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {conversation.agent_id}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(conversation.agent_id, conversation.conversation_id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              copiedId === conversation.conversation_id
                                ? "text-green-500 dark:text-green-400"
                                : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                            }`}
                            title={copiedId === conversation.conversation_id ? "Copied!" : "Copy Agent ID"}
                          >
                            {copiedId === conversation.conversation_id ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDuration(conversation.call_duration_secs)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {conversation.message_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(conversation.call_successful)}
                    </td>                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Conversation Details Sidebar */}
      <AnimatePresence>
        {selectedConversation && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedConversation(null)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-[600px] h-full bg-white dark:bg-dark-200 shadow-2xl flex flex-col z-50 pb-24"
            >
              {/* Header */}
              <div className="flex-shrink-0 border-b border-gray-200 dark:border-dark-100">
                <div className="p-6 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary dark:text-primary-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                        Conversation Details
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        View transcript and analytics
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content - Scrollable Area */}
              <div className="flex-1 overflow-y-auto">
                {loadingDetails ? (
                  <div className="p-8 flex justify-center items-center">
                    <Loader />
                  </div>
                ) : conversationDetails ? (
                  <div className="p-6 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5"
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <Clock className="w-4 h-4 text-primary dark:text-primary-400" />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            Duration
                          </span>
                        </div>
                        <p className="text-2xl font-heading font-bold text-primary dark:text-primary-400">
                          {formatDuration(
                            conversationDetails.conversation.metadata
                              .call_duration_secs,
                          )}
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5"
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <Activity className="w-4 h-4 text-primary dark:text-primary-400" />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            Messages
                          </span>
                        </div>
                        <p className="text-2xl font-heading font-bold text-primary dark:text-primary-400">
                          {conversationDetails.conversation.transcript.length}
                        </p>
                      </motion.div>
                    </div>

                    {/* Audio Controls */}
                    {conversationDetails.audio && (
                      <div className="bg-gray-50 dark:bg-dark-100 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-dark-100">
                          <div className="flex items-center space-x-2">
                            <Volume2 className="w-4 h-4 text-primary dark:text-primary-400" />
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              Call Recording
                            </h3>
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="flex items-center space-x-4">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={handlePlayAudio}
                              className="w-12 h-12 rounded-full bg-white dark:bg-dark-200 shadow-lg flex items-center justify-center text-primary dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                            >
                              {isPlaying ? (
                                <Pause className="w-6 h-6" />
                              ) : (
                                <Play className="w-6 h-6" />
                              )}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={handleDownloadAudio}
                              className="w-12 h-12 rounded-full bg-white dark:bg-dark-200 shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
                            >
                              <Download className="w-6 h-6" />
                            </motion.button>
                          </div>
                          <div className="space-y-2">
                            <input
                              type="range"
                              min="0"
                              max={duration}
                              value={currentTime}
                              onChange={handleSeek}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-200"
                            />
                            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                              <span>{formatDuration(currentTime)}</span>
                              <span>{formatDuration(duration)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Data Collection Results */}
                    {(() => {
                      // Check if data_collection_results exists and has content
                      const dataCollection = conversationDetails.conversation.analysis.data_collection_results;
                      const hasDataCollection = dataCollection && typeof dataCollection === 'object' && Object.keys(dataCollection).length > 0;

                      return hasDataCollection ? (
                        <DataCollectionSection 
                          dataCollection={dataCollection} 
                        />
                      ) : (
                        // Show a placeholder if no data collection results
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Database className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Data Collection Results
                            </h3>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-dark-100">
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                              No data collection results available for this conversation.
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Summary */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Summary
                        </h3>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-dark-100">
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {
                            conversationDetails.conversation.analysis
                              .transcript_summary
                          }
                        </p>
                      </div>
                    </div>

                    {/* Transcript */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-primary dark:text-primary-400" />
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            Transcript
                          </h3>
                        </div>
                      </div>

                      {/* Transcript Messages */}
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4">
                        {conversationDetails.conversation.transcript.map(
                          (message, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 * index }}
                              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div className="flex items-end space-x-2 max-w-[80%]">
                                {message.role !== "user" && (
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center flex-shrink-0">
                                    <Phone className="w-4 h-4 text-primary dark:text-primary-400" />
                                  </div>
                                )}

                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  className={`relative group rounded-2xl p-4 ${
                                    message.role === "user"
                                      ? "bg-gradient-to-br from-primary to-primary-600 text-white"
                                      : "bg-gray-100 dark:bg-dark-100 text-gray-900 dark:text-white"
                                  }`}
                                >
                                  {/* Message Header */}
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs font-bold opacity-80">
                                        {message.role === "user"
                                          ? "You"
                                          : "Agent"}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1 text-xs opacity-60">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {formatDuration(
                                          message.time_in_call_secs,
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Message Content */}
                                  <p className="text-sm leading-relaxed font-medium">
                                    {message.message}
                                  </p>
                                </motion.div>

                                {message.role === "user" && (
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-primary dark:text-primary-400" />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CallHistory;