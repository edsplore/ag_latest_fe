import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Webhook, Settings, Plus } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";

interface BuiltInTool {
  name: string;
  description: string;
  type: "system";
  response_timeout_secs: number;
  params: {
    system_tool_type: string;
  };
}

interface UserTool {
  tool_id: string;
  created_at: string;
}

interface ToolDetails {
  id: string;
  name: string;
  description: string;
  type: string;
  response_timeout_secs?: number;
  api_schema?: any;
  // Add other tool properties as needed
}

interface ToolConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tool: any;
  agentId?: string;
  onSave: (toolIds: string[], builtInTools: { [key: string]: BuiltInTool | null }) => void;
  toolIds: string[];
  builtInTools: { [key: string]: BuiltInTool | null };
  editingTool?: { type: 'tool_id', id: string } | { type: 'built_in', key: string };
}

const BUILT_IN_TOOL_KEYS = [
  "end_call",
  "language_detection", 
  "transfer_to_agent",
  "transfer_to_number",
  "skip_turn",
  "play_keypad_touch_tone"
];

const getBuiltInToolDefaults = (key: string): BuiltInTool => {
  const defaults: { [key: string]: BuiltInTool } = {
    end_call: {
      name: "end_call",
      description: "End the current call",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "end_call"
      }
    },
    language_detection: {
      name: "language_detection",
      description: "Detect the language being spoken",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "language_detection"
      }
    },
    transfer_to_agent: {
      name: "transfer_to_agent",
      description: "Transfer call to another agent",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "transfer_to_agent"
      }
    },
    transfer_to_number: {
      name: "transfer_to_number",
      description: "Transfer call to a phone number",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "transfer_to_number"
      }
    },
    skip_turn: {
      name: "skip_turn",
      description: "Skip the current turn",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "skip_turn"
      }
    },
    play_keypad_touch_tone: {
      name: "play_keypad_touch_tone",
      description: "Play keypad touch tone",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "play_keypad_touch_tone"
      }
    }
  };

  return defaults[key];
};

export const ToolConfigModal = ({
  isOpen,
  onClose,
  tool,
  onSave,
  agentId,
  toolIds,
  builtInTools,
  editingTool
}: ToolConfigModalProps) => {
  const [toolType, setToolType] = useState<string>(() => {
    if (editingTool) {
      if (editingTool.type === 'tool_id') {
        return editingTool.id;
      } else {
        return editingTool.key;
      }
    }
    return "add_new";
  });

  const [selectedBuiltInKey, setSelectedBuiltInKey] = useState(() => {
    if (editingTool?.type === 'built_in') {
      return editingTool.key;
    }
    return "";
  });

  const [builtInToolConfig, setBuiltInToolConfig] = useState<BuiltInTool | null>(() => {
    if (editingTool?.type === 'built_in') {
      return builtInTools[editingTool.key] || getBuiltInToolDefaults(editingTool.key);
    }
    return null;
  });

  const [newToolConfig, setNewToolConfig] = useState({
    name: "",
    description: "",
    type: "webhook",
    response_timeout_secs: 20,
    api_schema: {
      url: "",
      method: "POST",
      request_body_schema: {
        type: "object",
        properties: {},
        required: []
      }
    }
  });

  const [ghlConfig, setGhlConfig] = useState({
    ghlApiKey: "",
    ghlCalendarId: "",
    ghlLocationId: ""
  });

  const [calConfig, setCalConfig] = useState({
    calApiKey: ""
  });

  const [userTools, setUserTools] = useState<UserTool[]>([]);
  const [toolDetailsCache, setToolDetailsCache] = useState<{ [key: string]: ToolDetails }>({});
  const [selectedToolDetails, setSelectedToolDetails] = useState<ToolDetails | null>(null);
    const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [loadingToolDetails, setLoadingToolDetails] = useState(false);
  const [error, setError] = useState("");

  const { user } = useAuth();

  // Fetch user tools from Firebase
  useEffect(() => {
    const fetchUserTools = async () => {
      if (!user) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}`, {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserTools(data.tool_config || []);
        }
      } catch (error) {
        console.error('Error fetching user tools:', error);
      }
    };

    if (isOpen) {
      fetchUserTools();
    }
  }, [isOpen, user]);

  // Fetch tool details when a tool ID is selected
  useEffect(() => {
    const fetchToolDetails = async (toolId: string) => {
      if (!user || !toolId || toolDetailsCache[toolId]) {
        if (toolDetailsCache[toolId]) {
          setSelectedToolDetails(toolDetailsCache[toolId]);
            setSelectedToolId(toolId);
          // Check if it's a GHL tool and extract config
          const cachedTool = toolDetailsCache[toolId];
          if (cachedTool.name === 'GHL_BOOKING' && cachedTool.api_schema?.request_body_schema?.properties) {
            const props = cachedTool.api_schema.request_body_schema.properties;
            setGhlConfig({
              ghlApiKey: props.apiKey?.constant_value || '',
              ghlCalendarId: props.calendarId?.constant_value || '',
              ghlLocationId: props.locationId?.constant_value || ''
            });
            // Auto-update tool type to ghl_booking for existing GHL tools
            setToolType('ghl_booking');
          } else if (cachedTool.name === 'CALCOM' && cachedTool.api_schema?.request_body_schema?.properties) {
            const props = cachedTool.api_schema.request_body_schema.properties;
            setCalConfig({
              calApiKey: props.apiKey?.constant_value || ''
            });
            setToolType('calcom');
          }
        }
        return;
      }

      setLoadingToolDetails(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${toolId}`, {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        });

        if (response.ok) {
          const apiResponse = await response.json();
          const toolDetails = apiResponse.tool_config;
          setToolDetailsCache(prev => ({ ...prev, [toolId]: toolDetails }));
          setSelectedToolDetails(toolDetails);
            setSelectedToolId(toolId);

          // Check if it's a GHL tool and extract config
          if (toolDetails.name === 'GHL_BOOKING' && toolDetails.api_schema?.request_body_schema?.properties) {
            const props = toolDetails.api_schema.request_body_schema.properties;
            setGhlConfig({
              ghlApiKey: props.apiKey?.constant_value || '',
              ghlCalendarId: props.calendarId?.constant_value || '',
              ghlLocationId: props.locationId?.constant_value || ''
            });
            // Auto-update tool type to ghl_booking for existing GHL tools
            setToolType('ghl_booking');
          } else if (toolDetails.name === 'CALCOM' && toolDetails.api_schema?.request_body_schema?.properties) {
            const props = toolDetails.api_schema.request_body_schema.properties;
            setCalConfig({
              calApiKey: props.apiKey?.constant_value || ''
            });
            setToolType('calcom');
          }
        }
      } catch (error) {
        console.error('Error fetching tool details:', error);
        setError('Failed to fetch tool details');
      } finally {
        setLoadingToolDetails(false);
      }
    };

    if (toolType !== "add_new" && !BUILT_IN_TOOL_KEYS.includes(toolType)) {
      fetchToolDetails(toolType);
    }
  }, [toolType, user, toolDetailsCache]);

  const handleClose = () => {
    setError("");
    if (!editingTool) {
      setToolType("add_new");
      setSelectedBuiltInKey("");
      setBuiltInToolConfig(null);
      setSelectedToolDetails(null);
        setSelectedToolId(null);
      setNewToolConfig({
        name: "",
        description: "",
        type: "webhook",
        response_timeout_secs: 20,
        api_schema: {
          url: "",
          method: "POST",
          request_body_schema: {
            type: "object",
            properties: {},
            required: []
          }
        }
      });
      setGhlConfig({
        ghlApiKey: "",
        ghlCalendarId: "",
        ghlLocationId: ""
      });
      setCalConfig({
        calApiKey: ""
      });
    }
    onClose();
  };

  const handleToolTypeChange = (type: string) => {
    setToolType(type);
    setError("");
    setSelectedToolDetails(null);
      setSelectedToolId(null);

    if (BUILT_IN_TOOL_KEYS.includes(type)) {
      setSelectedBuiltInKey(type);
      const existingConfig = builtInTools[type];
      setBuiltInToolConfig(existingConfig || getBuiltInToolDefaults(type));
    } else if (type === "ghl_booking") {
      // Reset GHL config when switching to GHL tool
      setGhlConfig({
        ghlApiKey: "",
        ghlCalendarId: "",
        ghlLocationId: ""
      });
      setSelectedBuiltInKey("");
      setBuiltInToolConfig(null);
    } else if (type === "calcom") {
      // Reset Cal.com config when switching to Cal.com tool
      setCalConfig({
        calApiKey: ""
      });
      setSelectedBuiltInKey("");
      setBuiltInToolConfig(null);
    } else {
      setSelectedBuiltInKey("");
      setBuiltInToolConfig(null);
    }
  };

  const handleSaveAndClose = async () => {
    if (!user) return;

    try {
      if (BUILT_IN_TOOL_KEYS.includes(toolType) && builtInToolConfig) {
        // Handle built-in tool
        const updatedBuiltInTools = {
          ...builtInTools,
          [toolType]: builtInToolConfig
        };
        onSave(toolIds, updatedBuiltInTools);
      } else if (toolType === "add_new") {
        // Create new tool
        if (!newToolConfig.name.trim()) {
          setError("Tool name is required");
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tools/create/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({tool_config: newToolConfig, user_id: user.uid}),
        });

        if (!response.ok) {
          throw new Error('Failed to create tool');
        }

        const createdTool = await response.json();
        const updatedToolIds = [...toolIds, createdTool.id];
        onSave(updatedToolIds, builtInTools);
      } else if (toolType === "ghl_booking" && !editingTool) {
        // Create new GHL booking tool
        if (!ghlConfig.ghlApiKey || !ghlConfig.ghlCalendarId || !ghlConfig.ghlLocationId) {
          setError("All GHL fields (API Key, Calendar ID, Location ID) are required");
          return;
        }

        const ghlToolConfig = {
          name: "GHL_BOOKING",
          description: "Create a booking in GHL calendar",
          type: "webhook",
          response_timeout_secs: 20,
          api_schema: {
            url: `${import.meta.env.VITE_BACKEND_URL}/ghl/book/`,
            method: 'POST',
            request_body_schema: {
              type: 'object',
              properties: {
                apiKey: {
                  type: "string",
                  constant_value: ghlConfig.ghlApiKey
                }, 
                calendarId: {
                  type: "string",
                  constant_value: ghlConfig.ghlCalendarId
                }, 
                locationId: {
                  type: "string",
                  constant_value: ghlConfig.ghlLocationId
                },
                startTime: {
                  type: 'string',
                  description: 'Event start time in ISO 8601 format with timezone offset (e.g. 2021-06-23T03:30:00+05:30)'
                },
                endTime: {
                  type: 'string',
                  description: 'Event end time in ISO 8601 format with timezone offset (e.g. 2021-06-23T04:30:00+05:30)'
                },
                title: {
                  type: 'string',
                  description: 'Title or name of the event/appointment to be created in GHL calendar'
                },
                timezone: {
                  type: "string",
                  description: "Timezone of the event in IANA timezone format (e.g. America/New_York, Europe/London)"
                },
                contactInfo: {
                  type: 'object',
                  properties: {
                    phone: {
                      type: 'string',
                      description: 'Contact phone number with country code'
                    },
                    firstName: {
                      type: 'string',
                      description: 'First name of the contact'
                    },
                    lastName: {
                      type: 'string',
                      description: 'Last name of the contact'
                    },
                    email: {
                      type: 'string',
                      description: 'Email address of the contact'
                    }
                  },
                  required: ['phone'],
                  description: 'Contact information for GHL'
                }
              },
              required: ['startTime', 'endTime', 'title', 'timezone', 'contactInfo']
            }
          }
        };

        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tools/create/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({tool_config: ghlToolConfig, user_id: user.uid}),
        });

        if (!response.ok) {
          throw new Error('Failed to create GHL tool');
        }

        const createdTool = await response.json();
        const updatedToolIds = [...toolIds, createdTool.id];
        onSave(updatedToolIds, builtInTools);
      } else if (toolType === "calcom" && !editingTool) {
        // Create new Cal.com booking tool
        if (!calConfig.calApiKey) {
          setError("Cal.com API Key is required");
          return;
        }

        const calToolConfig = {
          name: "CALCOM",
          description: "Create a booking in Cal.com",
          type: "webhook",
          response_timeout_secs: 20,
          api_schema: {
            url: `${import.meta.env.VITE_BACKEND_URL}/calcom/book/`,
            method: 'POST',
            request_body_schema: {
              type: 'object',
              properties: {
                apiKey: {
                  type: "string",
                  constant_value: calConfig.calApiKey
                },
                startTime: {
                  type: 'string',
                  description: 'Event start time in ISO 8601 format with timezone offset (e.g. 2021-06-23T03:30:00+05:30)'
                },
                endTime: {
                  type: 'string',
                  description: 'Event end time in ISO 8601 format with timezone offset (e.g. 2021-06-23T04:30:00+05:30)'
                },
                title: {
                  type: 'string',
                  description: 'Title or name of the event/appointment to be created in Cal.com'
                },
                timezone: {
                  type: "string",
                  description: "Timezone of the event in IANA timezone format (e.g. America/New_York, Europe/London)"
                },
                contactInfo: {
                  type: 'object',
                  properties: {
                    phone: {
                      type: 'string',
                      description: 'Contact phone number with country code'
                    },
                    firstName: {
                      type: 'string',
                      description: 'First name of the contact'
                    },
                    lastName: {
                      type: 'string',
                      description: 'Last name of the contact'
                    },
                    email: {
                      type: 'string',
                      description: 'Email address of the contact'
                    }
                  },
                  required: ['phone'],
                  description: 'Contact information for Cal.com'
                }
              },
              required: ['startTime', 'endTime', 'title', 'timezone', 'contactInfo']
            }
          }
        };

        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tools/create/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({tool_config: calToolConfig, user_id: user.uid}),
        });

        if (!response.ok) {
          throw new Error('Failed to create Cal.com tool');
        }

        const createdTool = await response.json();
        const updatedToolIds = [...toolIds, createdTool.id];
        onSave(updatedToolIds, builtInTools);
      } else if (toolType === "ghl_booking" && editingTool?.type === 'tool_id' && selectedToolDetails) {
        // Update existing GHL tool
        if (!ghlConfig.ghlApiKey || !ghlConfig.ghlCalendarId || !ghlConfig.ghlLocationId) {
          setError("All GHL fields (API Key, Calendar ID, Location ID) are required");
          return;
        }

        let updatedToolDetails = { ...selectedToolDetails };
        updatedToolDetails.api_schema.request_body_schema.properties = {
          ...selectedToolDetails.api_schema.request_body_schema.properties,
          apiKey: {
            ...selectedToolDetails.api_schema.request_body_schema.properties.apiKey,
            constant_value: ghlConfig.ghlApiKey
          },
          calendarId: {
            ...selectedToolDetails.api_schema.request_body_schema.properties.calendarId,
            constant_value: ghlConfig.ghlCalendarId
          },
          locationId: {
            ...selectedToolDetails.api_schema.request_body_schema.properties.locationId,
            constant_value: ghlConfig.ghlLocationId
          }
        };

        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${selectedToolId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ tool_config: updatedToolDetails }),
        });

        if (!response.ok) {
          throw new Error('Failed to update GHL tool');
        }

        // Keep existing tool IDs since we're updating, not adding
        onSave(toolIds, builtInTools);
      } else if (toolType === "calcom" && editingTool?.type === 'tool_id' && selectedToolDetails) {
        // Update existing Cal.com tool
        if (!calConfig.calApiKey) {
          setError("Cal.com API Key is required");
          return;
        }

        let updatedToolDetails = { ...selectedToolDetails };
        updatedToolDetails.api_schema.request_body_schema.properties = {
          ...selectedToolDetails.api_schema.request_body_schema.properties,
          apiKey: {
            ...selectedToolDetails.api_schema.request_body_schema.properties.apiKey,
            constant_value: calConfig.calApiKey
          }
        };

        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${selectedToolId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ tool_config: updatedToolDetails }),
        });

        if (!response.ok) {
          throw new Error('Failed to update Cal.com tool');
        }

        // Keep existing tool IDs since we're updating, not adding
        onSave(toolIds, builtInTools);
      }else {
        // Handle existing tool ID selection or update
        if (editingTool?.type === 'tool_id' && selectedToolDetails) {
          // Update existing tool
          let updatedToolDetails = { ...selectedToolDetails };

          // Update GHL configuration if it's a GHL tool
          if (selectedToolDetails.name === 'GHL_BOOKING' && selectedToolDetails.api_schema?.request_body_schema?.properties) {
            if (!ghlConfig.ghlApiKey || !ghlConfig.ghlCalendarId || !ghlConfig.ghlLocationId) {
              setError("All GHL fields (API Key, Calendar ID, Location ID) are required");
              return;
            }

            updatedToolDetails.api_schema.request_body_schema.properties = {
              ...selectedToolDetails.api_schema.request_body_schema.properties,
              apiKey: {
                ...selectedToolDetails.api_schema.request_body_schema.properties.apiKey,
                constant_value: ghlConfig.ghlApiKey
              },
              calendarId: {
                ...selectedToolDetails.api_schema.request_body_schema.properties.calendarId,
                constant_value: ghlConfig.ghlCalendarId
              },
              locationId: {
                ...selectedToolDetails.api_schema.request_body_schema.properties.locationId,
                constant_value: ghlConfig.ghlLocationId
              }
            };
          } else if (selectedToolDetails.name === 'CALCOM' && selectedToolDetails.api_schema?.request_body_schema?.properties) {
            if (!calConfig.calApiKey) {
              setError("Cal.com API Key is required");
              return;
            }

            updatedToolDetails.api_schema.request_body_schema.properties = {
              ...selectedToolDetails.api_schema.request_body_schema.properties,
              apiKey: {
                ...selectedToolDetails.api_schema.request_body_schema.properties.apiKey,
                constant_value: calConfig.calApiKey
              }
            };
          }

          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${selectedToolId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({ tool_config: updatedToolDetails }),
          });

          if (!response.ok) {
            throw new Error('Failed to update tool');
          }
        }

        // Add tool ID to agent if not already present
        if (!toolIds.includes(toolType)) {
          const updatedToolIds = [...toolIds, toolType];
          onSave(updatedToolIds, builtInTools);
        } else {
          // Tool already exists in agent, just save current state
          onSave(toolIds, builtInTools);
        }
      }

      handleClose();
    } catch (error) {
      console.error('Error saving tool:', error);
      setError('Failed to save tool');
    }
  };

  const getToolTypeOptions = () => {
    const options = [
      { value: "add_new", label: "➕ Add New Tool", icon: Plus },
      { value: "ghl_booking", label: "🗓️ GHL Booking Tool", icon: Webhook },
      { value: "calcom", label: "🗓️ Cal.com Booking Tool", icon: Webhook }
    ];

    // Add user's available tools
    userTools.forEach(userTool => {
      if (!toolIds.includes(userTool.tool_id)) {
        options.push({
          value: userTool.tool_id,
          label: userTool.tool_id,
          icon: Webhook
        });
      }
    });

    // Add built-in tool keys
    BUILT_IN_TOOL_KEYS.forEach(key => {
      options.push({
        value: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        icon: Settings
      });
    });

    return options;
  };

  const isBuiltInTool = BUILT_IN_TOOL_KEYS.includes(toolType);
  const isNewTool = toolType === "add_new";
  const isGhlTool = toolType === "ghl_booking" || selectedToolDetails?.name === 'GHL_BOOKING';
  const isCalTool = toolType === "calcom" || selectedToolDetails?.name === 'CALCOM';
  const isExistingTool = !isBuiltInTool && !isNewTool && !isGhlTool && !isCalTool;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-[600px] h-full bg-white dark:bg-dark-200 shadow-2xl flex flex-col z-50"
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-primary/10 dark:border-primary/20">
              <div className="p-6 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
                    {isNewTool ? (
                      <Plus className="w-6 h-6 text-primary dark:text-primary-400" />
                    ) : isBuiltInTool ? (
                      <Settings className="w-6 h-6 text-primary dark:text-primary-400" />
                    ) : (
                      <Webhook className="w-6 h-6 text-primary dark:text-primary-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-lato font-semibold text-primary dark:text-primary-400">
                      {editingTool ? 'Edit Tool' : 'Add Tool'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {editingTool ? 'Edit the selected tool configuration' : 'Add a tool to your agent'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-8">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  </div>
                )}

                {/* Tool Type Selection */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                      Tool Type
                    </label>
                    <select
                      value={toolType}
                      onChange={(e) => handleToolTypeChange(e.target.value)}
                      disabled={!!editingTool}
                      className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400 disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {getToolTypeOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Loading Tool Details */}
                  {loadingToolDetails && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Loading tool details...
                      </p>
                    </div>
                  )}

                  {/* New Tool Configuration */}
                  {isNewTool && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          Create a new custom tool with your own configuration.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Tool Name
                        </label>
                        <input
                          type="text"
                          value={newToolConfig.name}
                          onChange={(e) => setNewToolConfig(prev => ({ ...prev, name: e.target.value }))}
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          placeholder="Enter tool name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Description
                        </label>
                        <textarea
                          value={newToolConfig.description}
                          onChange={(e) => setNewToolConfig(prev => ({ ...prev, description: e.target.value }))}
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          rows={3}
                          placeholder="Describe what this tool does"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Webhook URL
                        </label>
                        <input
                          type="url"
                          value={newToolConfig.api_schema?.url || ""}
                          onChange={(e) => setNewToolConfig(prev => ({
                            ...prev,
                            api_schema: { ...prev.api_schema, url: e.target.value }
                          }))}
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          placeholder="https://your-webhook-url.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Response Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          value={newToolConfig.response_timeout_secs}
                          onChange={(e) => setNewToolConfig(prev => ({ ...prev, response_timeout_secs: parseInt(e.target.value) || 20 }))}
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          min="1"
                          max="120"
                        />
                      </div>
                    </div>
                  )}

                  {/* GHL Tool Configuration */}
                  {(isGhlTool || (selectedToolDetails?.name === 'GHL_BOOKING')) && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {isGhlTool ? 'Create a GHL booking tool with automatic schema configuration.' : 'GHL Booking Tool Configuration'}
                        </p>
                      </div>

                      {/* Show tool name and description for existing GHL tools */}
                      {selectedToolDetails && (
                        <>
                          <div>
                            <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                              Tool Name
                            </label>
                            <input
                              type="text"
                              value={selectedToolDetails.name}
                              onChange={(e) => setSelectedToolDetails(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                              Description
                            </label>
                            <textarea
                              value={selectedToolDetails.description}
                              onChange={(e) => setSelectedToolDetails(prev => prev ? { ...prev, description: e.target.value } : null)}
                              className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                              rows={3}
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          GHL API Key <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={ghlConfig.ghlApiKey}
                          onChange={(e) => setGhlConfig(prev => ({ ...prev, ghlApiKey: e.target.value }))}
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          placeholder="Enter your GHL API key"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Calendar ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={ghlConfig.ghlCalendarId}
                          onChange={(e) => setGhlConfig(prev => ({ ...prev, ghlCalendarId: e.target.value }))}
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          placeholder="Enter GHL calendar ID"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Location ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={ghlConfig.ghlLocationId}
                          onChange={(e) => setGhlConfig(prev => ({ ...prev, ghlLocationId: e.target.value }))}
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          placeholder="Enter GHL location ID"
                        />
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="text-sm font-lato font-semibold text-gray-900 dark:text-white mb-3">
                          {selectedToolDetails ? 'API Schema (Auto-configured)' : 'Required Parameters (Auto-configured)'}
                        </h3>
                        {selectedToolDetails?.api_schema && (
                          <>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <strong>Endpoint:</strong> {selectedToolDetails.api_schema?.url || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <strong>Method:</strong> {selectedToolDetails.api_schema?.method || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <strong>Required Parameters:</strong>
                            </div>
                          </>
                        )}
                        <pre className="text-sm font-mono bg-white dark:bg-dark-200 p-4 rounded-lg border border-gray-200 dark:border-dark-100 overflow-x-auto">
                          {`{
  "startTime": "2021-06-23T03:30:00+05:30",
  "endTime": "2021-06-23T04:30:00+05:30", 
  "title": "Test Event",
  "timezone": "America/New_York",
  "contactInfo": {
    "phone": "+15551234567",
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john.doe@example.com"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  )}

                    {/* Cal.com Tool Configuration */}
                  {(isCalTool || (selectedToolDetails?.name === 'CALCOM')) && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {isCalTool ? 'Create a Cal.com booking tool with automatic schema configuration.' : 'Cal.com Booking Tool Configuration'}
                        </p>
                      </div>

                      {/* Show tool name and description for existing Cal.com tools */}
                      {selectedToolDetails && (
                        <>
                          <div>
                            <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                              Tool Name
                            </label>
                            <input
                              type="text"
                              value={selectedToolDetails.name}
                              onChange={(e) => setSelectedToolDetails(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                              Description
                            </label>
                            <textarea
                              value={selectedToolDetails.description}
                              onChange={(e) => setSelectedToolDetails(prev => prev ? { ...prev, description: e.target.value } : null)}
                              className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                              rows={3}
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Cal.com API Key <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={calConfig.calApiKey}
                          onChange={(e) => setCalConfig(prev => ({ ...prev, calApiKey: e.target.value }))}
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          placeholder="Enter your Cal.com API key"
                        />
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="text-sm font-lato font-semibold text-gray-900 dark:text-white mb-3">
                          {selectedToolDetails ? 'API Schema (Auto-configured)' : 'Required Parameters (Auto-configured)'}
                        </h3>
                        {selectedToolDetails?.api_schema && (
                          <>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <strong>Endpoint:</strong> {selectedToolDetails.api_schema?.url || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <strong>Method:</strong> {selectedToolDetails.api_schema?.method || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <strong>Required Parameters:</strong>
                            </div>
                          </>
                        )}
                        <pre className="text-sm font-mono bg-white dark:bg-dark-200 p-4 rounded-lg border border-gray-200 dark:border-dark-100 overflow-x-auto">
                          {`{
  "startTime": "2021-06-23T03:30:00+05:30",
  "endTime": "2021-06-23T04:30:00+05:30", 
  "title": "Test Event",
  "timezone": "America/New_York",
  "contactInfo": {
    "phone": "+15551234567",
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john.doe@example.com"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Non-GHL Existing Tool Details */}
                  {isExistingTool && selectedToolDetails && selectedToolDetails.name !== 'GHL_BOOKING' && selectedToolDetails.name !== 'CALCOM' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Using existing tool: {selectedToolDetails.name}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Tool Name
                        </label>
                        <input
                          type="text"
                          value={selectedToolDetails.name}
                          onChange={(e) => setSelectedToolDetails(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Description
                        </label>
                        <textarea
                          value={selectedToolDetails.description}
                          onChange={(e) => setSelectedToolDetails(prev => prev ? { ...prev, description: e.target.value } : null)}
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  {/* Built-in Tool Configuration */}
                  {isBuiltInTool && builtInToolConfig && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          This is a built-in system tool with predefined functionality.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Description
                        </label>
                        <textarea
                          value={builtInToolConfig.description}
                          onChange={(e) =>
                            setBuiltInToolConfig({
                              ...builtInToolConfig,
                              description: e.target.value,
                            })
                          }
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          rows={3}
                          placeholder="Describe what this tool does"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Response Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          value={builtInToolConfig.response_timeout_secs}
                          onChange={(e) =>
                            setBuiltInToolConfig({
                              ...builtInToolConfig,
                              response_timeout_secs: parseInt(e.target.value) || 20,
                            })
                          }
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          min="1"
                          max="120"
                        />
                      </div>

                      {/* Fixed Fields */}
                      <div className="pt-4 border-t border-gray-200 dark:border-dark-100">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          The following fields are system-defined and cannot be modified:
                        </p>

                        <div className="mb-4">
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={builtInToolConfig.name}
                            disabled
                            className="input font-lato font-semibold disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            Type
                          </label>
                          <input
                            type="text"
                            value={builtInToolConfig.type}
                            disabled
                            className="input font-lato font-semibold disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            System Tool Type
                          </label>
                          <input
                            type="text"
                            value={builtInToolConfig.params.system_tool_type}
                            disabled
                            className="input font-lato font-semibold disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-dark-200 border-t border-gray-200 dark:border-dark-100 p-4">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-lato font-semibold text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAndClose}
                  disabled={
                      loadingToolDetails ||
                      (isNewTool && !newToolConfig.name.trim()) ||
                      (isBuiltInTool && !builtInToolConfig) ||
                      (isGhlTool && (!ghlConfig.ghlApiKey || !ghlConfig.ghlCalendarId || !ghlConfig.ghlLocationId)) ||
                      (isCalTool && !calConfig.calApiKey)
                    }
                  className={cn(
                      "px-4 py-2 text-sm font-lato font-semibold text-white bg-primary rounded-lg",
                      "hover:bg-primary-600 transition-colors",
                      (loadingToolDetails ||
                       (isNewTool && !newToolConfig.name.trim()) ||
                       (isBuiltInTool && !builtInToolConfig) ||
                       (isGhlTool && (!ghlConfig.ghlApiKey || !ghlConfig.ghlCalendarId || !ghlConfig.ghlLocationId)) ||
                       (isCalTool && !calConfig.calApiKey)) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                >
                  {editingTool ? 'Save Changes' : 'Add Tool'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};