import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Webhook, Settings } from "lucide-react";
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
  const [toolType, setToolType] = useState<"tool_id" | string>(() => {
    if (editingTool) {
      if (editingTool.type === 'tool_id') {
        return "tool_id";
      } else {
        return editingTool.key;
      }
    }
    return "tool_id";
  });
  const [toolIdInput, setToolIdInput] = useState(() => {
    if (editingTool?.type === 'tool_id') {
      return editingTool.id;
    }
    return "";
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
  const [error, setError] = useState("");

  const { user } = useAuth();

  const handleClose = () => {
    setError("");
    if (!editingTool) {
      setToolType("tool_id");
      setToolIdInput("");
      setSelectedBuiltInKey("");
      setBuiltInToolConfig(null);
    }
    onClose();
  };

  const handleToolTypeChange = (type: string) => {
    setToolType(type);
    setError("");

    if (BUILT_IN_TOOL_KEYS.includes(type)) {
      setSelectedBuiltInKey(type);
      // Load existing config or use defaults
      const existingConfig = builtInTools[type];
      setBuiltInToolConfig(existingConfig || getBuiltInToolDefaults(type));
    } else {
      setSelectedBuiltInKey("");
      setBuiltInToolConfig(null);
    }
  };

  const handleSaveAndClose = () => {
    if (toolType === "tool_id") {
      if (!toolIdInput.trim()) {
        setError("Tool ID is required");
        return;
      }

      // If editing, allow the same ID, otherwise check for duplicates
      if (!editingTool && toolIds.includes(toolIdInput.trim())) {
        setError("Tool ID already exists");
        return;
      }

      let updatedToolIds = [...toolIds];
      
      if (editingTool?.type === 'tool_id') {
        // Replace the existing tool ID
        const index = updatedToolIds.indexOf(editingTool.id);
        if (index !== -1) {
          updatedToolIds[index] = toolIdInput.trim();
        }
      } else {
        // Add new tool ID
        updatedToolIds.push(toolIdInput.trim());
      }

      onSave(updatedToolIds, builtInTools);
    } else if (BUILT_IN_TOOL_KEYS.includes(toolType) && builtInToolConfig) {
      const updatedBuiltInTools = {
        ...builtInTools,
        [toolType]: builtInToolConfig
      };
      onSave(toolIds, updatedBuiltInTools);
    }

    handleClose();
  };

  const getToolTypeOptions = () => {
    const options = [
      { value: "tool_id", label: "Tool ID" }
    ];

    // Add built-in tool keys that are not already configured
    BUILT_IN_TOOL_KEYS.forEach(key => {
      options.push({
        value: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      });
    });

    return options;
  };

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
                    {toolType === "tool_id" ? (
                      <Webhook className="w-6 h-6 text-primary dark:text-primary-400" />
                    ) : (
                      <Settings className="w-6 h-6 text-primary dark:text-primary-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-lato font-semibold text-primary dark:text-primary-400">
                      {editingTool ? 'Edit Tool' : 'Add Tool'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {editingTool ? 'Edit the selected tool configuration' : 'Add a tool ID or configure a built-in tool'}
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
                      className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                    >
                      {getToolTypeOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tool ID Input */}
                  {toolType === "tool_id" && (
                    <div>
                      <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                        Tool ID
                      </label>
                      <input
                        type="text"
                        value={toolIdInput}
                        onChange={(e) => {
                          setToolIdInput(e.target.value);
                          setError("");
                        }}
                        className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                        placeholder="Enter tool ID"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Enter the ID of an external tool/webhook to include
                      </p>
                    </div>
                  )}

                  {/* Built-in Tool Configuration */}
                  {BUILT_IN_TOOL_KEYS.includes(toolType) && builtInToolConfig && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          This is a built-in system tool with predefined functionality.
                        </p>
                      </div>

                      {/* Fixed Name */}
                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Name (Fixed)
                        </label>
                        <input
                          type="text"
                          value={builtInToolConfig.name}
                          readOnly
                          className="input font-lato font-semibold bg-gray-100 dark:bg-dark-100 cursor-not-allowed"
                        />
                      </div>

                      {/* Editable Description */}
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

                      {/* Response Timeout */}
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
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Maximum time to wait for the tool to respond (1-120 seconds)
                        </p>
                      </div>

                      {/* Fixed Type */}
                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Type (Fixed)
                        </label>
                        <input
                          type="text"
                          value={builtInToolConfig.type}
                          readOnly
                          className="input font-lato font-semibold bg-gray-100 dark:bg-dark-100 cursor-not-allowed"
                        />
                      </div>

                      {/* System Tool Type */}
                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          System Tool Type (Fixed)
                        </label>
                        <input
                          type="text"
                          value={builtInToolConfig.params.system_tool_type}
                          readOnly
                          className="input font-lato font-semibold bg-gray-100 dark:bg-dark-100 cursor-not-allowed"
                        />
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
                    (toolType === "tool_id" && !toolIdInput.trim()) ||
                    (BUILT_IN_TOOL_KEYS.includes(toolType) && !builtInToolConfig)
                  }
                  className={cn(
                    "px-4 py-2 text-sm font-lato font-semibold text-white bg-primary rounded-lg",
                    "hover:bg-primary-600 transition-colors",
                    ((toolType === "tool_id" && !toolIdInput.trim()) ||
                     (BUILT_IN_TOOL_KEYS.includes(toolType) && !builtInToolConfig)) &&
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