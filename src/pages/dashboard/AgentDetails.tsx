import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  MessageSquare,
  Volume2,
  Thermometer,
  Sparkles,
  Globe,
  Settings,
  Speech,
  Webhook,
  ChevronRight,
  Plus,
  Database,
  Trash2,
  Zap,
  CheckCircle2,
  ArrowRight,
  Phone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import CallTesting from "../../components/CallTesting";
import { KnowledgeBaseSelect } from "../../components/KnowledgeBaseSelect";
import { VoiceModal } from "../../components/VoiceModal"; // <-- The updated VoiceModal
import { ModelSelect } from "../../components/ModelSelect";
import { DataCollectionVariable } from "../../components/DataCollectionVariable";
import { WebhookVariable } from "../../components/WebhookVariable";
import { ToolConfigModal } from "../../components/ToolConfigModal";
import { LanguageSelect } from "../../components/LanguageSelect";
import { Loader, PageLoader } from "../../components/Loader";
import {
  getModelId,
  getLanguageName,
  llmOptions,
  getAvailableModels,
} from "../../lib/constants";

interface DynamicVariable {
  type: string;  // "boolean" | "string" | "number" | "integer"
  description?: string;
  dynamic_variable?: string;
  constant_value?: string; // "string" | "integer" | "double" | "boolean"
}

interface PrivacySettings {
  record_voice?: boolean;
  retention_days?: number;
  delete_transcript_and_pii?: boolean;
  delete_audio?: boolean;
  apply_to_existing_conversations?: boolean;
  zero_retention_mode?: boolean;
}

interface AgentDetails {
  agent_id: string;
  name: string;
  platform_settings: {
    data_collection: {
      [key: string]: DynamicVariable;
    };
    workspace_overrides: {
      conversation_initiation_client_data_webhook?: {
        url: string;
        request_headers: {
          "Content-Type": string;
        };
      }
    };
    privacy?: PrivacySettings;
  }
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
        llm: string;
        temperature: number;
        custom_llm?: CustomLlm;
        knowledge_base: {
          id: string;
          name: string;
          type: string;
        }[];
        tools: {
          type: string;
          name: string;
          description: string;
          api_schema: {
            url: string;
            method: string;
          };
        }[];
      };
      first_message: string;
      language: string;
    };
    tts: {
      voice_id: string;
      model_id: string;
      optimize_streaming_latency: number; // The optimization for streaming latency
      stability: number; // The stability of generated speech ( double, >=0 to <=1, defaults to 0.5)
      speed: number; // The speed of generated speech ( double, >=0.7 to <=1.2, defaults to 1)
      similarity_boost: number; // The similarity boost for generated speech ( double, >=0 to <=1, defaults to 0.8)
    };
    turn: {
      turn_timeout: number; //Maximum wait time for the user's reply before re-engaging the user (double, defaults to 7)
      silence_end_call_timeout: number; // Maximum wait time since the user last spoke before terminating the call (double, defaults to -1)
      mode: string; // enum: "silence" or "turn"
    };
    asr?: {
      keywords?: string[];
    };
  };
}

interface VoiceLabels {
  accent?: string;
  description?: string;
  age?: string;
  gender?: string;
  use_case?: string;
}

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  labels?: VoiceLabels;
}

interface KnowledgeBaseDocument {
  id: string;
  name: string;
  type: "file" | "url";
  extracted_inner_html: string;
}

interface CustomLlm {
  url: string;
  model_id?: string;
  api_key: {
    secret_id: string;
  };
}

interface EditForm {
  name: string;
  prompt: string;
  llm: string;
  temperature: number;
  first_message: string;
  voice_id: string;
  language: string;
  modelType: string;
  custom_llm?: CustomLlm;
  platform_settings?: {
    data_collection: {
      [key: string]: DynamicVariable;
    };
    workspace_overrides?: {
      conversation_initiation_client_data_webhook?: {
        url: string;
        request_headers: {
          "Content-Type": string;
        };
      }
    };
    privacy?: PrivacySettings;
  };
  knowledge_base: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  tools: Array<{
    type: string;
    name: string;
    description: string;
    api_schema: {
      url: string;
      method: string;
    };
  }>;
  tts?: {
    optimize_streaming_latency?: number;
    stability?: number;
    speed?: number;
    similarity_boost?: number;
  };
  turn?: {
    turn_timeout?: number;
    silence_end_call_timeout?: number;
    mode?: string;
  };
  asr?: {
    keywords?: string[];
  };
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Basic agent icon logic
const agentIcons = [{ icon: Speech, color: "primary" }];
const getAgentIcon = (agentId: string) => {
  const index =
    Math.abs(
      agentId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0),
    ) % agentIcons.length;
  return agentIcons[index];
};

const AgentDetails = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { getEffectiveUser, user: originalUser } = useAuth();
  const user = getEffectiveUser();

  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [voice, setVoice] = useState<Voice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseDocument[]>(
    [],
  );
  const [loadingKnowledgeBase, setLoadingKnowledgeBase] = useState(false);

  // UI toggles
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [isCreatingTool, setIsCreatingTool] = useState(false);
  const [showAdvancedVoiceSettings, setShowAdvancedVoiceSettings] = useState(false);
  const [showAdvancedConversationSettings, setShowAdvancedConversationSettings] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  const [editingVarName, setEditingVarName] = useState<string | null>(null);
  const [editingVarValue, setEditingVarValue] = useState<string>("");

  // The form data
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    prompt: "",
    llm: "",
    temperature: 0.7,
    first_message: "",
    voice_id: "",
    language: "en",
    modelType: "turbo",
    custom_llm: {
      url: "",
      model_id: "",
      api_key: {
        secret_id: ""
      }
    },
    knowledge_base: [],
    tools: [],
    platform_settings: {
      data_collection: {},
      workspace_overrides: {
        conversation_initiation_client_data_webhook: {
          url: '',
          request_headers: {
            "Content-Type": "application/json"
          }
        }
      },
      privacy: {
        record_voice: true,
        retention_days: -1,
        delete_transcript_and_pii: false,
        delete_audio: false,
        apply_to_existing_conversations: false,
        zero_retention_mode: false
      }
    },
    tts: {
      optimize_streaming_latency: 0,
      stability: 0.5,
      speed: 1.0,
      similarity_boost: 0.8
    },
    turn: {
      turn_timeout: 7,
      silence_end_call_timeout: -1,
      mode: "silence"
    },
    asr: {
      keywords: []
    }
  });
  const [editedForm, setEditedForm] = useState<EditForm>(editForm);

  const [conversationInitiationMode, setConversationInitiationMode] = useState(editForm.first_message === "" ? "user" : "bot");
  const [asrKeywordsInput, setAsrKeywordsInput] = useState("");
  const [secretName, setSecretName] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [generatingSecret, setGeneratingSecret] = useState(false);
  const [updatingSecret, setUpdatingSecret] = useState(false);
  const [dynamicVariablePlaceholders, setDynamicVariablePlaceholders] = useState<{[key: string]: string}>({});


  // Fetch agent details
  const fetchAgentDetails = async () => {
    if (!user || !agentId) return;

    try {
      setLoading(true);

      // 1) Fetch the Agent
      const response = await fetch(
        `${BACKEND_URL}/agents/${user.uid}/${agentId}`,
        {
          headers: {
            Authorization: `Bearer ${await originalUser.getIdToken()}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch agent details");
      }
      const agentData: AgentDetails = await response.json();
      setAgent(agentData);

      const modelType = agentData.conversation_config.tts.model_id;

      const initialForm = {
        name: agentData.name,
        prompt: agentData.conversation_config.agent.prompt.prompt,
        llm: agentData.conversation_config.agent.prompt.llm,
        temperature: agentData.conversation_config.agent.prompt.temperature,
        first_message: agentData.conversation_config.agent.first_message,
        voice_id: agentData.conversation_config.tts.voice_id,
        language: agentData.conversation_config.agent.language || "en",
        modelType,
        custom_llm: agentData.conversation_config.agent.prompt.custom_llm || {
          url: "",
          model_id: "",
          api_key: {
            secret_id: ""
          }
        },
        knowledge_base:
          agentData.conversation_config.agent.prompt.knowledge_base || [],
        tools: agentData.conversation_config.agent.prompt.tools || [],
        platform_settings: {
          data_collection: agentData.platform_settings?.data_collection || {},
          workspace_overrides: {
            conversation_initiation_client_data_webhook: agentData.platform_settings?.workspace_overrides?.conversation_initiation_client_data_webhook || {
              url: '',
              request_headers: {
                "Content-Type": "application/json"
              }
            }
          },
          privacy: agentData.platform_settings?.privacy || {
            record_voice: true,
            retention_days: -1,
            delete_transcript_and_pii: false,
            delete_audio: false,
            apply_to_existing_conversations: false,
            zero_retention_mode: false
          }
        },
        tts: {
          optimize_streaming_latency: agentData.conversation_config.tts.optimize_streaming_latency || 0,
          stability: agentData.conversation_config.tts.stability || 0.5,
          speed: agentData.conversation_config.tts.speed || 1.0,
          similarity_boost: agentData.conversation_config.tts.similarity_boost || 0.8
        },
        turn: {
          turn_timeout: agentData.conversation_config.turn.turn_timeout || 7,
          silence_end_call_timeout: agentData.conversation_config.turn.silence_end_call_timeout || -1,
          mode: agentData.conversation_config.turn.mode || "silence"
        },
        asr: agentData.conversation_config.asr ? { ...agentData.conversation_config.asr } : { keywords: [] }
      };
      setEditForm(initialForm);
      setEditedForm(initialForm);
      setConversationInitiationMode(initialForm.first_message === "" ? "user" : "bot");
      setAsrKeywordsInput(initialForm.asr?.keywords?.join(", ") || "");

      // Initialize dynamic variable placeholders
      const dynamicVars = extractDynamicVariables(initialForm.first_message);
      const placeholders: {[key: string]: string} = {};

      // First, populate with existing saved values from backend
      const savedPlaceholders = agentData.conversation_config.agent.dynamic_variables?.dynamic_variable_placeholders || {};
      Object.keys(savedPlaceholders).forEach(key => {
        placeholders[key] = savedPlaceholders[key] || '';
      });

      // Then, ensure all variables found in the message have entries (with empty string if not saved)
      dynamicVars.forEach(varName => {
        if (placeholders[varName] === undefined) {
          placeholders[varName] = '';
        }
      });

      setDynamicVariablePlaceholders(placeholders);

      // Reset secret fields
      setSecretName("");
      setSecretValue("");
      setUpdatingSecret(false);


      // 2) Fetch details of the currently selected voice
      const voiceResponse = await fetch(
        `${BACKEND_URL}/voices/get-voice/${agentData.conversation_config.tts.voice_id}`,
        {
          headers: {
            Authorization: `Bearer ${await originalUser.getIdToken()}`,
          },
        },
      );
      if (voiceResponse.ok) {
        const voiceData: Voice = await voiceResponse.json();
        setVoice(voiceData);
      }

      // 3) Fetch ALL voices
      setLoadingVoices(true);
      const voicesResponse = await fetch(`${BACKEND_URL}/voices/list-voices`, {
        headers: {
          Authorization: `Bearer ${await originalUser.getIdToken()}`,
        },
      });
      if (voicesResponse.ok) {
        const data = await voicesResponse.json();
        if (data.voices && Array.isArray(data.voices)) {
          setVoices(data.voices);
        }
      }

      // 4) Fetch knowledge base docs
      setLoadingKnowledgeBase(true);
      const kbResponse = await fetch(
        `${BACKEND_URL}/knowledge-base/${user.uid}`,
        {
          headers: {
            Authorization: `Bearer ${await originalUser?.getIdToken()}`,
          },
        },
      );
      if (kbResponse.ok) {
        const kbData = await kbResponse.json();
        setKnowledgeBase(kbData.documents || []);
      }
    } catch (err) {
      console.error("Error fetching agent details:", err);
      setError("Failed to load agent details. Please try again.");
    } finally {
      setLoading(false);
      setLoadingVoices(false);
      setLoadingKnowledgeBase(false);
    }
  };

  useEffect(() => {
    fetchAgentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, agentId]);

  // Validate data collection variables
  const validateDataCollectionVariables = () => {
    const dataCollection = editedForm.platform_settings?.data_collection || {};
    for (const [varName, varConfig] of Object.entries(dataCollection)) {
      if (varConfig.description !== undefined) {
        if (!varConfig.description || varConfig.description.trim() === '') {
          throw new Error(`Description is required for variable "${varName}"`);
        }
      } else if (varConfig.constant_value !== undefined) {
        if (!varConfig.constant_value || varConfig.constant_value.trim() === '') {
          throw new Error(`Constant value is required for variable "${varName}"`);
        }
      } else if (varConfig.dynamic_variable !== undefined) {
        if (!varConfig.dynamic_variable || varConfig.dynamic_variable.trim() === '') {
          throw new Error(`Dynamic variable is required for variable "${varName}"`);
        }
      }
    }
  };

  // Save changes to backend
  const handleSave = async () => {
    if (!user || !agentId) return;
    try {
      setSaving(true);
      setError("");

      // Validate data collection variables before saving
      validateDataCollectionVariables();

      const response = await fetch(
        `${BACKEND_URL}/agents/${user.uid}/${agentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await originalUser?.getIdToken()}`,
          },
          body: JSON.stringify({
            name: editedForm.name,
            conversation_config: {
              agent: {
                prompt: {
                  prompt: editedForm.prompt,
                  llm: editedForm.llm,
                  temperature: editedForm.temperature,
                  ...(editedForm.llm === "custom-llm" && editedForm.custom_llm ? {
                    custom_llm: editedForm.custom_llm
                  } : {}),
                  knowledge_base: editedForm.knowledge_base,
                  tools: editedForm.tools,
                },
                first_message: conversationInitiationMode === "user" ? "" : editedForm.first_message,
                language: editedForm.language,
                ...(() => {
                  const firstMessage = conversationInitiationMode === "user" ? "" : editedForm.first_message;
                  const dynamicVarsInMessage = extractDynamicVariables(firstMessage);

                  if (dynamicVarsInMessage.length > 0 && Object.keys(dynamicVariablePlaceholders).length > 0) {
                    return {
                      dynamic_variables: {
                        dynamic_variable_placeholders: dynamicVariablePlaceholders
                      }
                    };
                  }
                  return {
                    dynamic_variables: {
                      dynamic_variable_placeholders: {}
                    }
                  }
                })()
              },
              tts: {
                voice_id: editedForm.voice_id,
                model_id: getModelId(editedForm.modelType, editedForm.language),
                optimize_streaming_latency: editedForm.tts?.optimize_streaming_latency || 0,
                stability: editedForm.tts?.stability || 0.5,
                speed: editedForm.tts?.speed || 1.0,
                similarity_boost: editedForm.tts?.similarity_boost || 0.8,
              },
              turn: {
                turn_timeout: editedForm.turn?.turn_timeout || 7,
                silence_end_call_timeout: editedForm.turn?.silence_end_call_timeout || -1,
                mode: editedForm.turn?.mode || "silence",
              },
              asr: {
                keywords: editedForm.asr?.keywords || []
              }
            },
            platform_settings: {
              data_collection: Object.fromEntries(
                Object.entries(editedForm.platform_settings?.data_collection || {}).map(([key, value]) => {
                  const { constant_value_type, ...rest } = value;
                  return [key, rest];
                })
              ),
              workspace_overrides: (() => {
                const webhookUrl = editedForm.platform_settings?.workspace_overrides?.conversation_initiation_client_data_webhook?.url;
                if (webhookUrl && webhookUrl.trim()) {
                  return {
                    conversation_initiation_client_data_webhook: {
                      url: webhookUrl,
                      request_headers: {
                        "Content-Type": "application/json"
                      }
                    }
                  };
                }
                return {};
              })(),
              privacy: editedForm.platform_settings?.privacy || {
                record_voice: true,
                retention_days: -1,
                delete_transcript_and_pii: false,
                delete_audio: false,
                apply_to_existing_conversations: false,
                zero_retention_mode: false
              }
            },
          }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to update agent");
      }
      await fetchAgentDetails();
      setHasChanges(false);
    } catch (err) {
      console.error("Error updating agent:", err);
      setError("Failed to update agent. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Cancel changes
  const handleCancel = () => {
    setEditedForm(editForm);
    setHasChanges(false);

    // Reset ASR keywords input
    setAsrKeywordsInput(editForm.asr?.keywords?.join(", ") || "");

    // Reset voice display to original voice
    const originalVoice = voices.find((v) => v.voice_id === editForm.voice_id);
    setVoice(originalVoice || null);

    setShowModelDropdown(false);
    setShowLanguageDropdown(false);
  };

  // Extract dynamic variables from first message
  const extractDynamicVariables = (message: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(message)) !== null) {
      matches.push(match[1]);
    }
    return [...new Set(matches)]; // Remove duplicates
  };

  // Utility for updating editedForm and marking unsaved changes
  const handleChange = (
    field: keyof EditForm,
    value: string | number | any[],
  ) => {
    setEditedForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);

    // If updating first_message, extract dynamic variables
    if (field === 'first_message' && typeof value === 'string') {
      const dynamicVars = extractDynamicVariables(value);
      const newPlaceholders = { ...dynamicVariablePlaceholders };

      // Add new variables
      dynamicVars.forEach(varName => {
        if (!newPlaceholders[varName]) {
          newPlaceholders[varName] = '';
        }
      });

      // Remove variables that are no longer in the message
      Object.keys(newPlaceholders).forEach(varName => {
        if (!dynamicVars.includes(varName)) {
          delete newPlaceholders[varName];
        }
      });

      setDynamicVariablePlaceholders(newPlaceholders);
    }
  };

  // Create a new tool
  const handleCreateTool = () => {
    const newTool = {
      type: "webhook",
      name: "",
      description: "",
      api_schema: {
        url: "",
        method: "POST",
        request_body_schema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    };
    setSelectedTool(newTool);
    setIsCreatingTool(true);
  };

  // Save a tool (either new or edited)
  const handleToolSave = (updatedTool: any) => {
    if (isCreatingTool) {
      setEditedForm((prev) => ({
        ...prev,
        tools: [...(prev.tools || []), { ...updatedTool, method: "POST" }],
      }));
      setIsCreatingTool(false);
    } else {
      const updatedTools = editedForm.tools.map((tool) =>
        tool.name === selectedTool?.name
          ? { ...updatedTool, method: "POST" }
          : tool,
      );
      setEditedForm((prev) => ({
        ...prev,
        tools: updatedTools,
      }));
    }
    setSelectedTool(null);
    setHasChanges(true);
  };

  const handleToolUpdate = (updatedTool: any) => {
    const updatedTools = editedForm.tools.map((tool) =>
      tool.name === updatedTool.name ? updatedTool : tool,
    );
    handleChange("tools", updatedTools);
  };

  // Called when user picks a new voice in the VoiceModal
  const handleVoiceChange = (voiceId: string) => {
    handleChange("voice_id", voiceId);
    const newVoice = voices.find((v) => v.voice_id === voiceId) || null;
    setVoice(newVoice);
  };

  // Generate secret ID via API call
  const handleGenerateSecret = async () => {
    if (!user || !secretName.trim() || !secretValue.trim()) return;

    try {
      setGeneratingSecret(true);
      setError("");

      const response = await fetch(`${BACKEND_URL}/secrets/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await originalUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          name: secretName.trim(),
          value: secretValue.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create secret");
      }

      const data = await response.json();

      // Update the custom_llm configuration with the received secret_id
      handleChange("custom_llm", {
        ...editedForm.custom_llm,
        api_key: {
          secret_id: data.secret_id
        }
      });

      // Clear the input fields since secret is now generated
      setSecretName("");
      setSecretValue("");

    } catch (err) {
      console.error("Error generating secret:", err);
      setError(err instanceof Error ? err.message : "Failed to generate secret. Please try again.");
    } finally {
      setGeneratingSecret(false);
    }
  };

  // Start updating secret - show input fields
  const handleStartUpdate = () => {
    setUpdatingSecret(true);
    // Clear the input fields when starting update
    setSecretName("");
    setSecretValue("");
  };

  // Cancel updating secret - hide input fields
  const handleCancelUpdate = () => {
    setUpdatingSecret(false);
    setSecretName("");
    setSecretValue("");
  };

  // Update existing secret via API call
  const handleUpdateSecret = async () => {
    if (!user || !secretName.trim() || !secretValue.trim() || !editedForm.custom_llm?.api_key?.secret_id) return;

    try {
      setGeneratingSecret(true);
      setError("");

      const response = await fetch(`${BACKEND_URL}/secrets/${editedForm.custom_llm.api_key.secret_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await originalUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          name: secretName.trim(),
          value: secretValue.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update secret");
      }

      const data = await response.json();

      // Update the custom_llm configuration with the updated secret_id
      handleChange("custom_llm", {
        ...editedForm.custom_llm,
        api_key: {
          secret_id: data.secret_id
        }
      });

      // Clear the input fields and exit update mode
      setSecretName("");
      setSecretValue("");
      setUpdatingSecret(false);

    } catch (err) {
      console.error("Error updating secret:", err);
      setError(err instanceof Error ? err.message : "Failed to update secret. Please try again.");
    } finally {
      setGeneratingSecret(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!agent) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-2">
            Agent not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The agent you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Link
            to="/dashboard/agents"
            className="inline-flex items-center text-primary hover:text-primary-600 dark:hover:text-primary-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Link>
        </div>
      </div>
    );
  }

  const { icon: Icon, color } = getAgentIcon(agent.agent_id);
  const colorClasses: Record<string, string> = {
    primary:
      "from-primary/20 to-primary/10 text-primary dark:from-primary/30 dark:to-primary/20",
    indigo: "from-indigo-500/20 to-indigo-500/10 text-indigo-500",
    rose: "from-rose-500/20 to-rose-500/10 text-rose-500",
    sky: "from-sky-500/20 to-sky-500/10 text-sky-500",
    yellow: "from-yellow-500/20 to-yellow-500/10 text-yellow-500",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="flex gap-8">
        <div className="flex-1">
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-dark-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    to="/dashboard/agents"
                    className="p-2 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>

                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={editedForm.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        className="text-2xl font-heading font-bold text-gray-900 dark:text-white bg-transparent border-0 focus:ring-0 p-0 focus:border-0"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Agent ID: {agent.agent_id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg flex items-start space-x-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Error
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {error}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-6">
                {/* Model Card */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowModelDropdown((prev) => !prev);
                  }}
                  className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 relative cursor-pointer hover:from-primary/10 hover:to-primary/20 transition-all"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary dark:text-primary-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Model
                    </h3>
                  </div>
                  {!showModelDropdown ? (
                    <p className="text-2xl font-heading font-bold text-primary dark:text-primary-400">
                      {editedForm.llm}
                    </p>
                  ) : (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={editedForm.llm}
                        onChange={(e) => handleChange("llm", e.target.value)}
                        className="rounded-lg border-2 border-primary bg-white dark:bg-dark-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                      >
                        {llmOptions.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </button>

                {/* Voice Card (opens VoiceModal) */}
                <button
                  onClick={() => setShowVoiceModal(true)}
                  className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 relative cursor-pointer hover:from-primary/10 hover:to-primary/20 transition-all"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Volume2 className="w-4 h-4 text-primary dark:text-primary-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Voice
                    </h3>
                  </div>
                  {/* Selected voice name */}
                  <p className="text-2xl font-heading font-bold text-primary dark:text-primary-400">
                    {voice?.name || "Not Set"}
                  </p>

                  {/* Additional labels */}
                  {voice?.labels && (
                    <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
                      {voice.labels.accent && (
                        <li>
                          <strong>Accent:</strong> {voice.labels.accent}
                        </li>
                      )}
                      {voice.labels.description && (
                        <li>
                          <strong>Description:</strong>{" "}
                          {voice.labels.description}
                        </li>
                      )}
                      {voice.labels.age && (
                        <li>
                          <strong>Age:</strong> {voice.labels.age}
                        </li>
                      )}
                      {voice.labels.gender && (
                        <li>
                          <strong>Gender:</strong> {voice.labels.gender}
                        </li>
                      )}
                      {voice.labels.use_case && (
                        <li>
                          <strong>Use Case:</strong> {voice.labels.use_case}
                        </li>
                      )}
                    </ul>
                  )}
                </button>

                {/* Language Card */}
                <button
                  onClick={() => setShowLanguageDropdown((prev) => !prev)}
                  className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 relative cursor-pointer hover:from-primary/10 hover:to-primary/20 transition-all"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Globe className="w-4 h-4 text-primary dark:text-primary-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Language
                    </h3>
                  </div>
                  {!showLanguageDropdown ? (
                    <p className="text-2xl font-heading font-bold text-primary dark:text-primary-400">
                      {getLanguageName(editedForm.language)}
                    </p>
                  ) : (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <LanguageSelect
                        value={editedForm.language}
                        onChange={(value) => handleChange("language", value)}
                      />
                    </div>
                  )}
                </button>
              </div>

              {/* Custom LLM Configuration */}
              {editedForm.llm === "custom-llm" && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-primary dark:text-primary-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Custom LLM Configuration
                    </h3>
                  </div>
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    {/* URL Field - Required */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={editedForm.custom_llm?.url || ""}
                        onChange={(e) =>
                          handleChange("custom_llm", {
                            ...editedForm.custom_llm,
                            url: e.target.value
                          })
                        }
                        className="input"
                        placeholder="https://api.example.com/v1/chat/completions"
                        required
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        The URL of the Chat Completions compatible endpoint
                      </p>
                    </div>

                    {/* Model ID Field - Optional */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        Model ID
                      </label>
                      <input
                        type="text"
                        value={editedForm.custom_llm?.model_id || ""}
                        onChange={(e) =>
                          handleChange("custom_llm", {
                            ...editedForm.custom_llm,
                            model_id: e.target.value
                          })
                        }
                        className="input"
                        placeholder="gpt-4"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        The model ID to be used if URL serves multiple models
                      </p>
                    </div>

                    {/* API Key Secret Configuration */}
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        API Key Secret <span className="text-red-500">*</span>
                      </label>

                      {/* Show input fields only when no secret ID exists or when updating */}
                      {(!editedForm.custom_llm?.api_key?.secret_id || updatingSecret) && (
                        <>
                          {/* Secret Name Field */}
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                              Secret Name
                            </label>
                            <input
                              type="text"
                              value={secretName}
                              onChange={(e) => setSecretName(e.target.value)}
                              className="input"
                              placeholder="my-api-key"
                            />
                          </div>

                          {/* Secret Value Field */}
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                              Secret Value (API Key)
                            </label>
                            <input
                              type="password"
                              value={secretValue}
                              onChange={(e) => setSecretValue(e.target.value)}
                              className="input"
                              placeholder="sk-..."
                            />
                          </div>
                        </>
                      )}

                      {/* Generated Secret ID Display */}
                      {editedForm.custom_llm?.api_key?.secret_id && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Generated Secret ID
                          </label>
                          <div className="p-3 bg-gray-50 dark:bg-dark-100 rounded-lg border">
                            <code className="text-sm text-gray-900 dark:text-gray-100">
                              {editedForm.custom_llm.api_key.secret_id}
                            </code>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {!editedForm.custom_llm?.api_key?.secret_id ? (
                        /* Generate Secret Button */
                        <button
                          type="button"
                          onClick={handleGenerateSecret}
                          disabled={!secretName.trim() || !secretValue.trim() || generatingSecret}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {generatingSecret ? (
                            <>
                              <Loader />
                              <span>Generating Secret...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>Generate Secret ID</span>
                            </>
                          )}
                        </button>
                      ) : updatingSecret ? (
                        /* Update and Cancel Buttons when in update mode */
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCancelUpdate}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleUpdateSecret}
                            disabled={!secretName.trim() || !secretValue.trim() || generatingSecret}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {generatingSecret ? (
                              <>
                                <Loader />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Update</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        /* Update Button when secret exists and not in update mode */
                        <button
                          type="button"
                          onClick={handleStartUpdate}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Update Secret</span>
                        </button>
                      )}

                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Create a secret in Workspace to securely store your API key
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Model Selection */}
              <div className="space-y-4 mt-6">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-primary dark:text-primary-400" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Voice Model
                  </h3>
                </div>
                <ModelSelect
                  modelType={editedForm.modelType}
                  onChange={(value) => handleChange("modelType", value)}
                  availableModels={getAvailableModels(editedForm.language)}
                />
              </div>

              {/* Temperature Slider */}
              <div className="space-y-4 mt-6">
                <div className="flex items-center space-x-2">
                  <Thermometer className="w-4 h-4 text-primary dark:text-primary-400" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Temperature ({editedForm.temperature})
                  </h3>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editedForm.temperature}
                  onChange={(e) =>
                    handleChange("temperature", parseFloat(e.target.value))
                  }
                  className="w-full"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Adjust creativity level: 0 for focused responses, 1 for more
                  creative outputs
                </p>
              </div>

              {/* Advanced Voice Settings */}
              <div className="space-y-4 mt-8">
                <button
                  onClick={() => setShowAdvancedVoiceSettings(!showAdvancedVoiceSettings)}
                  className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Advanced Voice Settings
                    </h3>
                  </div>
                  {showAdvancedVoiceSettings ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {showAdvancedVoiceSettings && (
                  <div className="space-y-6 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    {/* Optimize Streaming Latency */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Optimize Streaming Latency ({editedForm.tts?.optimize_streaming_latency || 0})
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        value={editedForm.tts?.optimize_streaming_latency || 0}
                        onChange={(e) =>
                          handleChange("tts", {
                            ...editedForm.tts,
                            optimize_streaming_latency: parseInt(e.target.value)
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Higher values prioritize speed over quality (0-4)
                      </p>
                    </div>

                    {/* Stability */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Stability ({editedForm.tts?.stability?.toFixed(2) || '0.50'})
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={editedForm.tts?.stability || 0.5}
                        onChange={(e) =>
                          handleChange("tts", {
                            ...editedForm.tts,
                            stability: parseFloat(e.target.value)
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Consistency of voice characteristics (0.0-1.0)
                      </p>
                    </div>

                    {/* Speed */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <ArrowRight className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Speed ({editedForm.tts?.speed?.toFixed(2) || '1.00'})
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.2"
                        step="0.01"
                        value={editedForm.tts?.speed || 1.0}
                        onChange={(e) =>
                          handleChange("tts", {
                            ...editedForm.tts,
                            speed: parseFloat(e.target.value)
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Speech rate (0.7-1.2, default 1.0)
                      </p>
                    </div>

                    {/* Similarity Boost */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Similarity Boost ({editedForm.tts?.similarity_boost?.toFixed(2) || '0.80'})
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={editedForm.tts?.similarity_boost || 0.8}
                        onChange={(e) =>
                          handleChange("tts", {
                            ...editedForm.tts,
                            similarity_boost: parseFloat(e.target.value)
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Enhances voice similarity to original (0.0-1.0)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Conversation Settings */}
              <div className="space-y-4 mt-8">
                <button
                  onClick={() => setShowAdvancedConversationSettings(!showAdvancedConversationSettings)}
                  className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Advanced Conversation Settings
                    </h3>
                  </div>
                  {showAdvancedConversationSettings ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {showAdvancedConversationSettings && (
                  <div className="space-y-6 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    {/* Turn Timeout */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Turn Timeout ({editedForm.turn?.turn_timeout?.toFixed(1) || '7.0'}s)
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        step="0.5"
                        value={editedForm.turn?.turn_timeout || 7}
                        onChange={(e) =>
                          handleChange("turn", {
                            ...editedForm.turn,
                            turn_timeout: parseFloat(e.target.value)
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Maximum wait time for user's reply before re-engaging (1-30 seconds)
                      </p>
                    </div>

                    {/* Silence End Call Timeout */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Silence End Call Timeout ({editedForm.turn?.silence_end_call_timeout === -1 ? 'Disabled' : `${editedForm.turn?.silence_end_call_timeout?.toFixed(1) || '60.0'}s`})
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="300"
                        step="1"
                        value={editedForm.turn?.silence_end_call_timeout || -1}
                        onChange={(e) =>
                          handleChange("turn", {
                            ...editedForm.turn,
                            silence_end_call_timeout: parseFloat(e.target.value)
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Maximum silence before ending call (-1 to disable, 0-300 seconds)
                      </p>
                    </div>

                    {/* Mode Switch */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Turn Mode
                        </h4>
                      </div>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="turnMode"
                            value="silence"
                            checked={editedForm.turn?.mode === "silence"}
                            onChange={(e) =>
                              handleChange("turn", {
                                ...editedForm.turn,
                                mode: e.target.value
                              })
                            }
                            className="radio-switch"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Silence</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="turnMode"
                            value="turn"
                            checked={editedForm.turn?.mode === "turn"}
                            onChange={(e) =>
                              handleChange("turn", {
                                ...editedForm.turn,
                                mode: e.target.value
                              })
                            }
                            className="radio-switch"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Turn</span>
                        </label>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Choose how the agent detects when the user has finished speaking
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ASR Keywords Section */}
              <div className="space-y-4 mt-8">
                <div className="flex items-center space-x-2">
                  <Speech className="w-5 h-5 text-primary dark:text-primary-400" />
                  <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                    ASR Keywords
                  </h3>
                </div>
                <div className="space-y-3 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enter keywords to improve speech recognition accuracy.
                  </p>
                  <input
                    type="text"
                    value={asrKeywordsInput}
                    onChange={(e) => {
                      setAsrKeywordsInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      // Process keywords when user finishes editing
                      const keywords = e.target.value
                        .split(",")
                        .map((keyword) => keyword.trim())
                        .filter(Boolean);
                      handleChange("asr", { ...editedForm.asr, keywords });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Process keywords when user presses Enter
                        const keywords = e.currentTarget.value
                          .split(",")
                          .map((keyword) => keyword.trim())
                          .filter(Boolean);
                        handleChange("asr", { ...editedForm.asr, keywords });
                      }
                    }}
                    className="input"
                    placeholder="Enter keywords, separated by commas"
                  />
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="space-y-4 mt-8">
                <button
                  onClick={() => setShowPrivacySettings(!showPrivacySettings)}
                  className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Privacy Settings
                    </h3>
                  </div>
                  {showPrivacySettings ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {showPrivacySettings && (
                  <div className="space-y-6 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    {/* Record Voice */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Record Voice
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Whether to record the conversation
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editedForm.platform_settings?.privacy?.record_voice ?? true}
                            onChange={(e) => {
                              handleChange("platform_settings", {
                                ...editedForm.platform_settings,
                                privacy: {
                                  ...editedForm.platform_settings?.privacy,
                                  record_voice: e.target.checked
                                }
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${editedForm.platform_settings?.privacy?.record_voice ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        </label>
                      </div>
                    </div>

                    {/* Retention Days */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Retention Days ({editedForm.platform_settings?.privacy?.retention_days === -1 ? 'No limit' : `${editedForm.platform_settings?.privacy?.retention_days || 0} days`})
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="365"
                        step="1"
                        value={editedForm.platform_settings?.privacy?.retention_days ?? -1}
                        onChange={(e) => {
                          handleChange("platform_settings", {
                            ...editedForm.platform_settings,
                            privacy: {
                              ...editedForm.platform_settings?.privacy,
                              retention_days: parseInt(e.target.value)
                            }
                          });
                        }}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        The number of days to retain the conversation. -1 indicates no retention limit
                      </p>
                    </div>

                    {/* Delete Transcript and PII */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Delete Transcript and PII
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Whether to delete the transcript and PII
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editedForm.platform_settings?.privacy?.delete_transcript_and_pii ?? false}
                            onChange={(e) => {
                              handleChange("platform_settings", {
                                ...editedForm.platform_settings,
                                privacy: {
                                  ...editedForm.platform_settings?.privacy,
                                  delete_transcript_and_pii: e.target.checked
                                }
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${editedForm.platform_settings?.privacy?.delete_transcript_and_pii ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        </label>
                      </div>
                    </div>

                    {/* Delete Audio */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Delete Audio
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Whether to delete the audio
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editedForm.platform_settings?.privacy?.delete_audio ?? false}
                            onChange={(e) => {
                              handleChange("platform_settings", {
                                ...editedForm.platform_settings,
                                privacy: {
                                  ...editedForm.platform_settings?.privacy,
                                  delete_audio: e.target.checked
                                }
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${editedForm.platform_settings?.privacy?.delete_audio ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        </label>
                      </div>
                    </div>

                    {/* Apply to Existing Conversations */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Apply to Existing Conversations
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Whether to apply the privacy settings to existing conversations
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editedForm.platform_settings?.privacy?.apply_to_existing_conversations ?? false}
                            onChange={(e) => {
                              handleChange("platform_settings", {
                                ...editedForm.platform_settings,
                                privacy: {
                                  ...editedForm.platform_settings?.privacy,
                                  apply_to_existing_conversations: e.target.checked
                                }
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${editedForm.platform_settings?.privacy?.apply_to_existing_conversations ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        </label>
                      </div>
                    </div>

                    {/* Zero Retention Mode */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Zero Retention Mode
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Whether to enable zero retention mode - no PII data is stored
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editedForm.platform_settings?.privacy?.zero_retention_mode ?? false}
                            onChange={(e) => {
                              handleChange("platform_settings", {
                                ...editedForm.platform_settings,
                                privacy: {
                                  ...editedForm.platform_settings?.privacy,
                                  zero_retention_mode: e.target.checked
                                }
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${editedForm.platform_settings?.privacy?.zero_retention_mode ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* First Message Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-primary dark:text-primary-400" />
                  <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                    Conversation Initiation
                  </h3>
                </div>

                {/* Conversation Initiation Switch */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conversationInitiation"
                        value="bot"
                        checked={conversationInitiationMode === "bot"}
                        onChange={() => {
                          setConversationInitiationMode("bot");
                          if (editedForm.first_message === "") {
                            handleChange("first_message", "Hello! How can I help you today?");
                          }
                        }}
                        className="radio-switch"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Bot starts conversation</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conversationInitiation"
                        value="user"
                        checked={conversationInitiationMode === "user"}
                        onChange={() => {
                          setConversationInitiationMode("user");
                          handleChange("first_message", "");
                        }}
                        className="radio-switch"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">User starts conversation</span>
                    </label>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose whether the bot should greet the user first or wait for the user to speak.
                  </p>
                </div>

                {/* First Message Configuration - Only show when bot starts */}
                {conversationInitiationMode === "bot" && (
                  <div className="space-y-3 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Choose a predefined opening message or create a custom one for your agent.
                    </p>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Bot's Opening Message
                    </h4>

                    {/* Predefined Messages Dropdown */}
                    <select
                      value={(() => {
                        const predefinedMessages = [
                          "Hello! How can I help you today?",
                          "Hi there! What can I assist you with?",
                          "Good day! I'm here to help. What do you need?",
                          "Welcome! How may I be of service?",
                          "Hello! Thank you for calling. How can I assist you today?",
                          "Hi! I'm ready to help. What questions do you have?"
                        ];
                        return predefinedMessages.includes(editedForm.first_message)
                          ? editedForm.first_message
                          : "custom";
                      })()}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          // Keep current message if it's already custom
                          if (!["Hello! How can I help you today?", "Hi there! What can I assist you with?", "Good day! I'm here to help. What do you need?", "Welcome! How may I be of service?", "Hello! Thank you for calling. How can I assist you today?", "Hi! I'm ready to help. What questions do you have?"].includes(editedForm.first_message)) {
                            return;
                          }
                          handleChange("first_message", "Enter your custom message...");
                        } else {
                          handleChange("first_message", e.target.value);
                        }
                      }}
                      className="input"
                    >
                      <option value="Hello! How can I help you today?">Hello! How can I help you today?</option>
                      <option value="Hi there! What can I assist you with?">Hi there! What can I assist you with?</option>
                      <option value="Good day! I'm here to help. What do you need?">Good day! I'm here to help. What do you need?</option>
                      <option value="Welcome! How may I be of service?">Welcome! How may I be of service?</option>
                      <option value="Hello! Thank you for calling. How can I assist you today?">Hello! Thank you for calling. How can I assist you today?</option>
                      <option value="Hi! I'm ready to help. What questions do you have?">Hi! I'm ready to help. What questions do you have?</option>
                      <option value="custom">Custom message...</option>
                    </select>

                    {/* Custom Input Field - shows when custom is selected or when message doesn't match predefined ones */}
                    {((() => {
                      const predefinedMessages = [
                        "Hello! How can I help you today?",
                        "Hi there! What can I assist you with?",
                        "Good day! I'm here to help. What do you need?",
                        "Welcome! How may I be of service?",
                        "Hello! Thank you for calling. How can I assist you today?",
                        "Hi! I'm ready to help. What questions do you have?"
                      ];
                      return !predefinedMessages.includes(editedForm.first_message);
                    })()) && (
                      <textarea
                        value={editedForm.first_message}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Prevent switching to user starts if field is being cleared
                          // Set a placeholder message to maintain bot starts mode
                          if (value.trim() === "") {
                            handleChange("first_message", "Enter your custom message...");
                          } else {
                            handleChange("first_message", value);
                          }
                        }}
                        rows={2}
                        className="input"
                        placeholder="Enter your custom first message..."
                        onFocus={(e) => {
                          // Clear placeholder text when user focuses
                          if (e.target.value === "Enter your custom message...") {
                            // Set to empty but don't trigger handleChange to avoid switching modes
                            setEditedForm(prev => ({ ...prev, first_message: "" }));
                          }
                        }}
                        onBlur={(e) => {
                          // If user leaves field empty, restore placeholder
                          if (e.target.value.trim() === "") {
                            handleChange("first_message", "Enter your custom message...");
                          }
                        }}
                      />
                    )}

                    {/* Dynamic Variable Placeholders */}
                    {Object.keys(dynamicVariablePlaceholders).length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Define values for the dynamic variables found in your first message.
                          </p>
                          {Object.keys(dynamicVariablePlaceholders).map((varName) => (
                            <div key={varName} className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {varName} <span className="text-gray-500 dark:text-gray-400 font-normal">(from {`{{${varName}}}`})</span>
                              </label>
                              <input
                                type="text"
                                value={dynamicVariablePlaceholders[varName]}
                                onChange={(e) => {
                                  setDynamicVariablePlaceholders(prev => ({
                                    ...prev,
                                    [varName]: e.target.value
                                  }));
                                  setHasChanges(true);
                                }}
                                className="input text-sm"
                                placeholder={`Enter value for ${varName}`}
                              />
                            </div>
                          ))}
                        </div>
                    )}
                  </div>
                )}
              </div>

              {/* Prompt Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-primary dark:text-primary-400" />
                  <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                    Prompt
                  </h3>
                </div>
                <textarea
                  value={editedForm.prompt}
                  onChange={(e) => handleChange("prompt", e.target.value)}
                  rows={6}
                  className="input"
                  placeholder="Enter the agent's behavior and instructions..."
                />
              </div>

              {/* Dynamic Variables Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Data Collection Variables
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      const newVar = {
                        name: `variable_${Object.keys(editedForm.platform_settings?.data_collection || {}).length + 1}`,
                        config: {
                          type: "string",
                          description: ""
                        }
                      };
                      const updatedCollection = {
                        ...editedForm.platform_settings?.data_collection,
                        [newVar.name]: newVar.config
                      };
                      handleChange("platform_settings", {
                        ...editedForm.platform_settings,
                        data_collection: updatedCollection
                      });
                    }}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm font-lato font-semibold text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50/50 dark:bg-primary-400/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Variable</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {Object.entries(editedForm.platform_settings?.data_collection || {}).length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-dark-100 rounded-xl">
                      <Database className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No data collection variables configured
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-dark-100">
                      {Object.entries(editedForm.platform_settings?.data_collection || {}).map(([varName, varConfig]) => (
                        <DataCollectionVariable
                          key={varName}
                          varName={varName}
                          varConfig={varConfig}
                          editingVarName={editingVarName}
                          editingVarValue={editingVarValue}
                          onEdit={(name, value) => {
                            setEditingVarName(name);
                            setEditingVarValue(value);
                          }}
                          onSave={(oldName, newName) => {
                            const oldConfig = editedForm.platform_settings?.data_collection?.[oldName];
                            const newDataCollection = { ...editedForm.platform_settings?.data_collection };
                            delete newDataCollection[oldName];
                            newDataCollection[newName] = oldConfig;

                            setEditedForm(prev => ({
                              ...prev,
                              platform_settings: {
                                ...prev.platform_settings,
                                data_collection: newDataCollection
                              }
                            }));
                            setEditingVarName(null);
                            setHasChanges(true);
                          }}
                          onCancel={() => setEditingVarName(null)}
                          onDelete={(name) => {
                            const { [name]: _, ...rest } = editedForm.platform_settings?.data_collection || {};
                            handleChange("platform_settings", {
                              ...editedForm.platform_settings,
                              data_collection: rest
                            });
                          }}
                          onChange={(name, config) => {
                            handleChange("platform_settings", {
                              ...editedForm.platform_settings,
                              data_collection: {
                                ...editedForm.platform_settings?.data_collection,
                                [name]: config
                              }
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tools Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Webhook className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Tools
                    </h3>
                  </div>
                  <button
                    onClick={handleCreateTool}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm font-lato font-semibold text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50/50 dark:bg-primary-400/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Tool</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {editedForm.tools?.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-dark-100 rounded-xl">
                      <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No tools configured
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Tools functionality coming soon
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-dark-100">
                      {editedForm.tools.map((tool, index) => (
                        <div
                          key={index}
                          className="py-4 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center space-x-3"
                              onClick={() => setSelectedTool(tool)}
                              style={{ cursor: "pointer" }}
                            >
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
                                <Webhook className="w-5 h-5 text-primary dark:text-primary-400" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {tool.name}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {tool.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  const updatedTools = editedForm.tools.filter(
                                    (t, i) => i !== index,
                                  );
                                  handleChange("tools", updatedTools);
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <ChevronRight
                                className="w-5 h-5 text-gray-400 dark:text-gray-500"
                                style={{ cursor: "pointer" }}
                                onClick={() => setSelectedTool(tool)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Webhook Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Webhook className="w-5 h-5 text-primary dark:text-primary-400" />
                  <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                    Webhook
                  </h3>
                </div>
                <WebhookVariable
                  url={editedForm.platform_settings?.workspace_overrides?.conversation_initiation_client_data_webhook?.url || ''}
                  onChange={(url) => {
                    handleChange('platform_settings', {
                      ...editedForm.platform_settings,
                      workspace_overrides: {
                        ...editedForm.platform_settings?.workspace_overrides,
                        conversation_initiation_client_data_webhook: {
                          url,
                          request_headers: {
                            "Content-Type": "application/json"
                          }
                        }
                      }
                    });
                  }}
                />
              </div>

              {/* Knowledge Base Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Knowledge Base Documents
                    </h3>
                  </div>
                  <Link
                    to="/dashboard/knowledge"
                    className="text-sm text-primary hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    Manage Documents
                  </Link>
                </div>

                {loadingKnowledgeBase ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader />
                  </div>
                ) : knowledgeBase.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-dark-100 rounded-xl">
                    <Database className="w-12 h-12 text-gray-400 mx-auto mb-2" />
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
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Select documents to include in your agent's knowledge
                        base. The agent will use these documents to provide more
                        accurate and contextual responses.
                      </p>
                    </div>
                    <div className="pb-[300px]">
                      <KnowledgeBaseSelect
                        documents={knowledgeBase}
                        selectedDocuments={editedForm.knowledge_base.map(
                          (kb) => kb.id,
                        )}
                        onSelectionChange={(selectedIds) => {
                          const selectedDocs = selectedIds.map((id) => {
                            const doc = knowledgeBase.find(
                              (kb) => kb.id === id,
                            );
                            return {
                              id: doc!.id,
                              name: doc!.name,
                              type: doc!.type,
                            };
                          });
                          handleChange("knowledge_base", selectedDocs);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Call Testing Section */}
        <div className="w-96">
          {agent && <CallTesting agentId={agent.agent_id} />}
        </div>
      </div>

      {/* Voice Modal - uses the updated VoiceModal above */}
      <VoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        voices={voices}
        selectedVoiceId={editedForm.voice_id}
        onVoiceChange={handleVoiceChange}
        onVoicesUpdate={fetchAgentDetails}
      />

      {/* Tool Configuration Modal */}
      {selectedTool && (
        <ToolConfigModal
          isOpen={!!selectedTool}
          onClose={() => {
            setSelectedTool(null);
            setIsCreatingTool(false);
          }}
          tool={selectedTool}
          onSave={handleToolSave}
          existingTools={editedForm.tools}
          agentId={agentId}
        />
      )}

      {/* Sticky Save/Cancel Buttons */}
      <AnimatePresence>
        {hasChanges && !selectedTool && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-200 border-t border-gray-200 dark:border-dark-100 shadow-lg z-50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-4 flex justify-end space-x-4">
                <button onClick={handleCancel} className="btn btn-secondary">
                  <X className="w-4 h-4 mr-2" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <>
                      <Loader />
                      <span className="ml-2">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentDetails;