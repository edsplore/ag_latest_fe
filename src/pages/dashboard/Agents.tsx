import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  X,
  Loader2,
  ArrowRight,
  Database,
  Speech,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { AudioPlayer } from "../../components/AudioPlayer";
import { KnowledgeBaseSelect } from "../../components/KnowledgeBaseSelect";
import { cn } from "../../lib/utils";
import {
  getModelId,
  getAvailableModels,
  llmOptions,
  languages,
} from "../../lib/constants";

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
}

interface CreateAgentPayload {
  user_id: string;
  conversation_config: {
    tts: {
      voice_id: string;
      model_id: string;

    };
    turn: Record<string, never>;
    agent: {
      prompt: {
        prompt: string;
        llm: string;
        temperature: number;
        knowledge_base: {
          id: string;
          name: string;
          type: string;
        }[];
        tool_ids: string[];
      };
      language: string;
    };
  };
  name: string;
}

interface AgentPrompt {
  prompt: string;
  llm: string;
  temperature: number;
  knowledge_base_document_ids?: string[];
}

interface AgentConfig {
  prompt: AgentPrompt;
}

interface Agent {
  agent_id: string;
  name: string;
  created_at_unix_secs: number;
  access_level: string;
  conversation_config?: {
    agent?: {
      prompt?: AgentPrompt;
    };
    tts?: {
      voice_id: string;
    };
  };
}

interface AgentListResponse {
  agents: Agent[];
  has_more: boolean;
  next_cursor: string | null;
}

interface KnowledgeBaseDocument {
  id: string;
  name: string;
  type: "file" | "url";
  extracted_inner_html: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const agentIcons = [{ icon: Speech, color: "primary" }];

const getAgentIcon = (agentId: string) => {
  const index =
    Math.abs(
      agentId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0),
    ) % agentIcons.length;
  return agentIcons[index];
};

const Agents = () => {
  const { getEffectiveUser, getEffectiveUserData, isAdmin } = useAuth();
  const user = getEffectiveUser();
  const userData = getEffectiveUserData();
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseDocument[]>(
    [],
  );
  const [loadingKnowledgeBase, setLoadingKnowledgeBase] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    prompt: "",
    llm: "gpt-4o",
    temperature: 0.7,
    voiceId: "",
    language: "en",
    modelType: "turbo",
  });
  const [nameError, setNameError] = useState("");

  const handleDeleteAgent = async (agentId: string) => {
    if (!user || !window.confirm("Are you sure you want to delete this agent?"))
      return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/agents/${user.uid}/${agentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete agent");
      }

      await fetchAgents();
    } catch (error) {
      console.error("Error deleting agent:", error);
      alert("Failed to delete agent. Please try again.");
    }
  };

  useEffect(() => {
    const fetchVoices = async () => {
      if (!isCreating) return;

      try {
        setLoadingVoices(true);
        const response = await fetch(`${BACKEND_URL}/voices/list-voices`, {
          headers: {
            Authorization: `Bearer ${await user?.getIdToken()}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch voices");
        }

        const data = await response.json();
        if (data.voices && Array.isArray(data.voices)) {
          setVoices(data.voices);
          if (data.voices.length > 0) {
            setFormData((prev) => ({
              ...prev,
              voiceId: data.voices[0].voice_id,
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching voices:", error);
      } finally {
        setLoadingVoices(false);
      }
    };

    fetchVoices();
  }, [isCreating, user]);

  const fetchAgents = async () => {
    if (!user) return;

    try {
      setLoadingAgents(true);
      const response = await fetch(`${BACKEND_URL}/agents/${user.uid}`, {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch agents");
      }

      const data: AgentListResponse = await response.json();
      setAgents(data.agents || []);

      setLoadingKnowledgeBase(true);
      const kbResponse = await fetch(
        `${BACKEND_URL}/knowledge-base/${user.uid}`,
        {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        },
      );

      if (kbResponse.ok) {
        const kbData = await kbResponse.json();
        if (kbData.documents && Array.isArray(kbData.documents)) {
          setKnowledgeBase(kbData.documents);
        } else {
          setKnowledgeBase([]);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingAgents(false);
      setLoadingKnowledgeBase(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [user]);

  // Update model type when language changes to ensure compatibility
  useEffect(() => {
    const availableModels = getAvailableModels(formData.language);
    const isCurrentModelAvailable = availableModels.some(model => model.id === formData.modelType);

    if (!isCurrentModelAvailable && availableModels.length > 0) {
      setFormData({ ...formData, modelType: availableModels[0].id });
    }
  }, [formData.language]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate agent name
    if (!formData.name.trim()) {
      setNameError("Please enter a name for your agent");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const knowledgeBaseArray = selectedDocuments.map((docId) => {
        const doc = knowledgeBase.find((kb) => kb.id === docId);
        return {
          id: doc!.id,
          name: doc!.name,
          type: doc!.type,
        };
      });

      const payload: CreateAgentPayload = {
        user_id: user.uid,
        conversation_config: {
          tts: {
            voice_id: formData.voiceId,
            model_id: getModelId(formData.modelType, formData.language),

          },
          turn: {},
          agent: {
            prompt: {
              prompt: formData.prompt,
              llm: formData.llm,
              temperature: formData.temperature,
              knowledge_base: knowledgeBaseArray,
              tool_ids: [],
            },
            language: formData.language,
          },
        },
        name: formData.name,
      };

      const response = await fetch(
        `${BACKEND_URL}/agents/create?use_tool_ids=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to create agent");
      }

      setIsCreating(false);
      setFormData({
        name: "",
        prompt: "",
        llm: "gpt-4o",
        temperature: 0.7,
        voiceId: "",
        language: "en",
        modelType: "turbo",
      });
      setSelectedDocuments([]);

      await fetchAgents();
    } catch (error) {
      console.error("Error creating agent:", error);
      setError("Failed to create agent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            AI Agents
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create and manage your AI agents
          </p>
        </div>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Agent
        </button>
      </div>

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
                  <Speech className="w-6 h-6 text-primary dark:text-primary-400" />
                  <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                    Create New Agent
                  </h2>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleCreateAgent}
                className="p-6 space-y-8 relative"
                noValidate
              >
                <div className="space-y-4">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Agent Name
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (e.target.value.trim()) {
                        setNameError("");
                      }
                    }}
                    placeholder="Enter a name for your agent"
                    className={cn(
                      "input",
                      nameError &&
                        "border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-500",
                    )}
                    required
                  />
                  {nameError && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                      {nameError}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="prompt"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Prompt
                  </label>
                  <textarea
                    id="prompt"
                    value={formData.prompt}
                    onChange={(e) =>
                      setFormData({ ...formData, prompt: e.target.value })
                    }
                    placeholder="Enter the agent's behavior and instructions..."
                    rows={4}
                    className="input"
                    required
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Describe how your agent should behave and interact with
                    users.
                  </p>
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="llm"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Language Model
                  </label>
                  <select
                    id="llm"
                    value={formData.llm}
                    onChange={(e) =>
                      setFormData({ ...formData, llm: e.target.value })
                    }
                    className="input"
                  >
                    {llmOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select the AI model that will power your agent.
                  </p>
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="temperature"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Temperature ({formData.temperature})
                  </label>
                  <input
                    type="range"
                    id="temperature"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        temperature: parseFloat(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Adjust creativity level: 0 for focused responses, 1 for more
                    creative outputs.
                  </p>
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="modelType"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Voice Model
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {getAvailableModels(formData.language).map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, modelType: model.id })
                        }
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.modelType === model.id
                            ? "border-primary bg-primary-50/50 dark:border-primary-400 dark:bg-primary-400/10"
                            : "border-gray-200 dark:border-dark-100 hover:border-primary/50 dark:hover:border-primary-400/50"
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                          {model.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {model.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="voiceId"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Voice
                  </label>
                  {loadingVoices ? (
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading available voices...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <select
                        id="voiceId"
                        value={formData.voiceId}
                        onChange={(e) =>
                          setFormData({ ...formData, voiceId: e.target.value })
                        }
                        className="input"
                        required
                      >
                        <option value="">Select a voice for your agent</option>
                        {voices.map((voice) => (
                          <option key={voice.voice_id} value={voice.voice_id}>
                            {voice.name}
                          </option>
                        ))}
                      </select>
                      {formData.voiceId &&
                        voices.find((v) => v.voice_id === formData.voiceId)
                          ?.preview_url && (
                          <AudioPlayer
                            audioUrl={
                              voices.find(
                                (v) => v.voice_id === formData.voiceId,
                              )!.preview_url
                            }
                          />
                        )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="language"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Agent Language
                  </label>
                  <select
                    id="language"
                    value={formData.language}
                    onChange={(e) =>
                      setFormData({ ...formData, language: e.target.value })
                    }
                    className="input"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose the default language the agent will communicate in.
                  </p>
                </div>

                <div className="space-y-4 pb-[300px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Knowledge Base
                  </label>
                  {loadingKnowledgeBase ? (
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading knowledge base...</span>
                    </div>
                  ) : knowledgeBase.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 dark:bg-dark-100 rounded-lg">
                      <Database className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No knowledge base documents found.
                      </p>
                      <Link
                        to="/dashboard/knowledge"
                        className="text-sm text-primary hover:text-primary-600 dark:hover:text-primary-400 mt-2 inline-block"
                      >
                        Add documents to knowledge base
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <KnowledgeBaseSelect
                        documents={knowledgeBase}
                        selectedDocuments={selectedDocuments}
                        onSelectionChange={setSelectedDocuments}
                      />
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-dark-200 py-4 border-t border-gray-200 dark:border-dark-100 mt-8">
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !formData.name.trim()}
                      className="btn btn-primary"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Agent"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
        {loadingAgents ? (
          <div className="p-8 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-primary-400" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Loading agents...
            </span>
          </div>
        ) : agents.length === 0 ? (
          <div className="p-8 text-center">
            <Speech className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-2">
              No agents yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first AI agent to get started with automated
              conversations.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="btn btn-outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Agent
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-dark-100">
            {agents.map((agent) => {
              const { icon: Icon, color } = getAgentIcon(agent.agent_id);
              const colorClasses = {
                primary: "from-primary/20 to-primary/10 text-primary",
                indigo: "from-indigo-500/20 to-indigo-500/10 text-indigo-500",
                rose: "from-rose-500/20 to-rose-500/10 text-rose-500",
                sky: "from-sky-500/20 to-sky-500/10 text-sky-500",
                amber: "from-amber-500/20 to-amber-500/10 text-amber-500",
                yellow: "from-yellow-500/20 to-yellow-500/10 text-yellow-500",
                purple: "from-purple-500/20 to-purple-500/10 text-purple-500",
                orange: "from-orange-500/20 to-orange-500/10 text-orange-500",
                emerald:
                  "from-emerald-500/20 to-emerald-500/10 text-emerald-500",
              };

              return (
                <Link
                  key={agent.agent_id}
                  to={`/dashboard/agents/${agent.agent_id}`}
                  className="block hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                              colorClasses[color]
                            } dark:from-opacity-30 dark:to-opacity-20 flex items-center justify-center`}
                          >
                            <Icon className="w-6 h-6 text-lime-500 dark:text-lime-500" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                            {agent.name}
                          </h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <p className="text-sm font-menu text-gray-500 dark:text-gray-400">
                              Created{" "}
                              {new Date(
                                agent.created_at_unix_secs * 1000,
                              ).toLocaleString()}
                            </p>
                            <div className="flex items-center space-x-1 text-xs font-menu"></div>
                            {agent.conversation_config?.tts?.voice_id && (
                              <div className="flex items-center space-x-1 text-xs font-menu">
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                <span className="text-gray-500 dark:text-gray-400">
                                  Voice Enabled
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary-400 transition-colors">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteAgent(agent.agent_id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors mr-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Agents;