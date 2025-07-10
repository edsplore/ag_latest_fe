import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Webhook } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";

interface Tool {
  type: string;
  name: string;
  description: string;
  expects_response?: boolean;
  ghlApiKey?: string;
  ghlCalendarId?: string;
  ghlLocationId?: string;
  calApiKey?: string;
  params?: {
    system_tool_type?: string;
    transfers?: {
      agent_id?: string;
      condition: string;
      phone_number?: string;
    }[];
  };
  api_schema?: {
    url?: string;
    request_body_schema?: {
      type: string;
      properties: {
        [key: string]: {
          type: string;
          description: string;
          dynamic_variable?: string;
          constant_value?: string;
          properties?: {
            [key: string]: {
              type: string;
              description: string;
              dynamic_variable?: string;
            };
          };
          items?: {
            type: string;
            description: string;
            dynamic_variable?: string;
          };
        };
      };
      required?: string[];
      description?: string;
    };
    method?: string;
  };
  response_timeout_secs?: number;
}

interface ToolConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tool: Tool;
  agentId?: string;
  onSave: (updatedTool: any, updatedBuiltInTools: any) => void;
  toolIds: string[];
  builtInTools: any;
}

const validateToolName = (name: string, type: string): string | null => {
  if (!name.trim()) {
    return "Tool name is required";
  }
  if (name.includes(" ")) {
    return "Tool name cannot contain spaces";
  }
  if (type === "webhook" && (name.toLowerCase() === "GHL_BOOKING".toLowerCase() || name.toLowerCase() === "CAL_BOOKING".toLowerCase() || name.toLowerCase() === "END_CALL".toLowerCase() || name.toLowerCase() === "TRANSFER_CALL".toLowerCase())) {
    return "Reserved tool name. Please choose a different name.";
  }
  if (type === "system" && name !== "end_call" && name !== "transfer_call") {
    return "Invalid system tool name";
  }
  return null;
};

const getDisplayType = (name: string) => {
  if (name === "GHL_BOOKING") return "ghl_booking";
  if (name === "CAL_BOOKING") return "calcom";
  return "webhook";
};

const getAllToolTypeOptions = () => [
  { value: "webhook", label: "Webhook" },
  { value: "ghl_booking", label: "GHL Booking" },
  { value: "calcom", label: "Cal.com" },
  { value: "end_call", label: "END_CALL" },
  { value: "transfer_call", label: "TRANSFER_CALL" },
];

interface BuiltInTool {
  name: string;
  description: string;
  type: string;
  response_timeout_secs: number;
  params: any;
}

export const ToolConfigModal = ({
  isOpen,
  onClose,
  tool,
  onSave,
  existingTools,
  agentId,
  toolIds,
  builtInTools
}: ToolConfigModalProps & { existingTools?: Tool[], toolIds: string[], builtInTools: any }) => {

  const toolTypeOptions = getAllToolTypeOptions().filter(option => {
    if(option.value === 'webhook') return "webhook";
    // For GHL booking, show if it's the current tool being edited
    if (option.value === 'ghl_booking') {
      return !existingTools?.some(t => t.name === 'GHL_BOOKING') || tool.name === 'GHL_BOOKING';
    }
    // For Cal.com, show if it's the current tool being edited
    if (option.value === 'calcom') {
      return !existingTools?.some(t => t.name === 'CAL_BOOKING') || tool.name === 'CAL_BOOKING';
    }
    // For end_call and transfer_call, show if it's the current tool being edited
    if (option.value === 'end_call') {
      return !existingTools?.some(t => t.name === 'end_call') || tool.name === 'end_call';
    }
    if (option.value === 'transfer_call') {
      return !existingTools?.some(t => t.name === 'transfer_call') || tool.name === 'transfer_call';
    }
    return true;
  });
  const [editedTool, setEditedTool] = useState<Tool>(() => {
    const toolCopy = JSON.parse(JSON.stringify(tool));
    if (toolCopy.name === "end_call") {
      toolCopy.type = "end_call";
    } else if (toolCopy.name === "transfer_call") {
      toolCopy.type = "transfer_call";
    } else {
      toolCopy.type = getDisplayType(toolCopy.name);
    }

    // Map saved GHL values from the backend schema if it's a GHL booking tool
    if (toolCopy.name === "GHL_BOOKING" && toolCopy.api_schema?.request_body_schema?.properties) {
      const schema = toolCopy.api_schema.request_body_schema.properties;
      toolCopy.ghlApiKey = schema.apiKey?.constant_value || '';
      toolCopy.ghlCalendarId = schema.calendarId?.constant_value || '';
      toolCopy.ghlLocationId = schema.locationId?.constant_value || '';
    }

    // Map saved Cal.com API key from the backend schema if it's a Cal.com booking tool
    if (toolCopy.name === "CAL_BOOKING" && toolCopy.api_schema?.request_body_schema?.properties) {
      const schema = toolCopy.api_schema.request_body_schema.properties;
      toolCopy.calApiKey = schema.apiKey?.constant_value || '';
    }

    return toolCopy;
  });
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState("");
  const [showSampleModal, setShowSampleModal] = useState(false);
  const { user } = useAuth();

  const handleClose = () => {
    setNameError(null);
    setError("");
    setJsonError("");
    onClose();
  };

  const handleSaveAndClose = () => {
    if (nameError || jsonError) return;

    // Validate required fields based on tool type
    if (editedTool.type === "ghl_booking" && (!editedTool.ghlApiKey || !editedTool.ghlCalendarId || !editedTool.ghlLocationId)) {
      return;
    }
    if (editedTool.type === "calcom" && !editedTool.calApiKey) {
      return;
    }

    let updatedToolIds = [...toolIds];
    let updatedBuiltInTools = { ...builtInTools };

    if (editedTool.type === "end_call" || editedTool.type === "transfer_call") {
      // Handle built-in tools
      const toolKey = editedTool.name.toLowerCase();
      const builtInTool: BuiltInTool = {
        name: editedTool.name,
        description: editedTool.description || "",
        response_timeout_secs: editedTool.response_timeout_secs || 20,
        type: "system",
        params: {
          system_tool_type: editedTool.name.toLowerCase()
        }
      };
      updatedBuiltInTools[toolKey] = builtInTool;
    } else {
      // Handle webhook tools - add to tool_ids
      const toolId = editedTool.name;
      if (!updatedToolIds.includes(toolId)) {
        updatedToolIds.push(toolId);
      }
    }

    onSave(updatedToolIds, updatedBuiltInTools);
    onClose();
  };

  const handleJsonChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      setJsonError("");
      setEditedTool((prev) => ({
        ...prev,
        api_schema: {
          ...prev.api_schema,
          request_body_schema: parsed,
        },
      }));
    } catch (err) {
      setJsonError("Invalid JSON format");
    }
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
                    <Webhook className="w-6 h-6 text-primary dark:text-primary-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-lato font-semibold text-primary dark:text-primary-400">
                      Tool Configuration
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Configure your tool settings
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
                {nameError && (
                  <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {nameError}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {/* Basic Info Section */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                      Tool Type
                    </label>
                    <select
                      value={editedTool.type}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Update edited tool state
                        setEditedTool({ ...editedTool, type: value });

                        // Pre-configure based on type
                        if (value === "end_call") {
                          setEditedTool({
                            ...editedTool,
                            type: "system",
                            name: "end_call",
                            description: "Ends the current call",
                            response_timeout_secs: 20,
                          });
                        } else if (value === "transfer_call") {
                          setEditedTool({
                            ...editedTool,
                            type: "system", 
                            name: "transfer_call",
                            description: "Transfers the call to another number",
                            response_timeout_secs: 20,
                          });
                        } else if (value === "ghl_booking") {
                          setEditedTool({
                            ...editedTool,
                            type: "webhook",
                            name: "GHL_BOOKING",
                            description: "Books an appointment using GoHighLevel",
                            api_schema: {
                              url: "",
                              method: "POST"
                            }
                          });
                        } else if (value === "calcom") {
                          setEditedTool({
                            ...editedTool,
                            type: "webhook", 
                            name: "CAL_BOOKING",
                            description: "Books an appointment using Cal.com",
                            api_schema: {
                              url: "",
                              method: "POST"
                            }
                          });
                        }
                      }}
                      className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                    >
                      {toolTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editedTool.type !== "end_call" && editedTool.type !== "transfer_call" && (
                    <>
                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Tool Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={editedTool.type === "ghl_booking" ? "GHL_BOOKING" : editedTool.type === "calcom" ? "CAL_BOOKING" : editedTool.name}
                            onChange={(e) => {
                              if (editedTool.type === "webhook") {
                                const newName = e.target.value;
                                setEditedTool((prev) => ({ ...prev, name: newName }));
                                setNameError(validateToolName(newName, editedTool.type));
                              }
                            }}
                            readOnly={editedTool.type !== "webhook"}
                            className={cn(
                              "input font-lato font-semibold focus:border-primary dark:focus:border-primary-400",
                              nameError && "border-red-500 dark:border-red-500",
                              editedTool.type !== "webhook" && "bg-gray-100 dark:bg-dark-100 cursor-not-allowed"
                            )}
                            placeholder="Enter tool name"
                          />
                          {nameError && editedTool.type === "webhook" && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                              {nameError}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Description
                        </label>
                        <textarea
                          value={editedTool.description}
                          onChange={(e) =>
                            setEditedTool((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          rows={3}
                          placeholder="Describe what this tool does and how it should be used"
                        />
                      </div>
                    </>
                  )}

                  {/* Conditionally render based on tool type */}
                  {editedTool.type === "webhook" && (
                    <div>
                      <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                        Webhook URL
                      </label>
                      <input
                        type="text"
                        value={editedTool.api_schema?.url || ""}
                        onChange={(e) =>
                          setEditedTool((prev) => ({
                            ...prev,
                            api_schema: {
                              ...prev.api_schema,
                              url: e.target.value,
                            },
                          }))
                        }
                        className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                        placeholder="https://api.example.com/endpoint"
                      />
                    </div>
                  )}

                  {editedTool.type === "ghl_booking" && (
                    <div className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            GHL API Key <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editedTool.ghlApiKey || ""}
                            onChange={(e) =>
                              setEditedTool((prev) => ({
                                ...prev,
                                ghlApiKey: e.target.value,
                              }))
                            }
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
                            value={editedTool.ghlCalendarId || ""}
                            onChange={(e) =>
                              setEditedTool((prev) => ({
                                ...prev,
                                ghlCalendarId: e.target.value,
                              }))
                            }
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
                            value={editedTool.ghlLocationId || ""}
                            onChange={(e) =>
                              setEditedTool((prev) => ({
                                ...prev,
                                ghlLocationId: e.target.value,
                              }))
                            }
                            className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                            placeholder="Enter GHL location ID"
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                        <h3 className="text-sm font-lato font-semibold text-gray-900 dark:text-white mb-3">
                          Required Parameters Example
                        </h3>
                        <pre className="text-sm font-mono bg-white dark:bg-dark-200 p-4 rounded-lg border border-gray-200 dark:border-dark-100">
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

                  {editedTool.type === "calcom" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Cal.com API Key <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editedTool.calApiKey || ""}
                          onChange={(e) =>
                            setEditedTool((prev) => ({
                              ...prev,
                              calApiKey: e.target.value,
                            }))
                          }
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          placeholder="Enter your Cal.com API key"
                        />
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                        <h3 className="text-sm font-lato font-semibold text-gray-900 dark:text-white mb-3">
                          Required Parameters Example
                        </h3>
                        <pre className="text-sm font-mono bg-white dark:bg-dark-200 p-4 rounded-lg border border-gray-200 dark:border-dark-100">
                          {`{
  "start": "2024-08-13T09:00:00Z",
  "end": "2024-08-13T10:00:00Z",
  "attendee": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "timeZone": "America/New_York"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  )}
                  {editedTool.type === "transfer_call" && (
                    <div>
                      <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                        Transfer to Phone Number
                      </label>
                      <input
                        type="text"
                        value={editedTool.params?.transfers?.[0]?.phone_number || ''}
                        onChange={(e) =>
                          setEditedTool((prev) => ({
                            ...prev,
                            params: {
                              system_tool_type: "transfer_to_number",
                              transfers: [{
                                phone_number: e.target.value,
                                condition: "transfer_to_number"
                              }]
                            }
                          }))
                        }
                        className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                        placeholder="Include + country code (e.g. +1234567890)"
                      />
                    </div>
                  )}
                </div>

                {/* System Tool Configuration */}
                {editedTool.type === "system" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        This is a system tool that provides built-in functionality.
                      </p>
                    </div>

                    {/* Response Timeout */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Response Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        value={editedTool.response_timeout_secs || 20}
                        onChange={(e) =>
                          setEditedTool({
                            ...editedTool,
                            response_timeout_secs: parseInt(e.target.value) || 20,
                          })
                        }
                        className="input"
                        min="1"
                        max="120"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Maximum time to wait for the tool to respond (1-120 seconds)
                      </p>
                    </div>
                  </div>
                )}

                {/* Conditionally render Request Body Schema only if type is 'webhook' */}
                {editedTool.type === "webhook" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                        Request Body Schema
                      </label>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Define the structure of the request body in JSON
                          format
                        </p>
                        <button
                          onClick={() => setShowSampleModal(true)}
                          className="text-sm text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-lato font-semibold"
                        >
                          View Sample Schema
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <textarea
                        value={JSON.stringify(
                          editedTool.api_schema?.request_body_schema || {},
                          null,
                          2,
                        )}
                        onChange={(e) => handleJsonChange(e.target.value)}
                        className={cn(
                          "input font-mono text-sm h-[400px] focus:border-primary dark:focus:border-primary-400",
                          jsonError && "border-red-500 dark:border-red-500",
                        )}
                        placeholder="Enter JSON schema..."
                      />
                      {jsonError && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                          {jsonError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
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
                      !!nameError || 
                      !!jsonError || 
                      (editedTool.type === "ghl_booking" && (!editedTool.ghlApiKey || !editedTool.ghlCalendarId || !editedTool.ghlLocationId)) ||
                      (editedTool.type === "calcom" && !editedTool.calApiKey)
                    }
                    className={cn(
                      "px-4 py-2 text-sm font-lato font-semibold text-white bg-primary rounded-lg",
                      "hover:bg-primary-600 transition-colors",
                      (!!nameError || 
                       !!jsonError || 
                       (editedTool.type === "ghl_booking" && (!editedTool.ghlApiKey || !editedTool.ghlCalendarId || !editedTool.ghlLocationId)) ||
                       (editedTool.type === "calcom" && !editedTool.calApiKey)) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>

            {/* Sample Schema Modal */}
            <AnimatePresence>
              {showSampleModal && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[60]"
                    onClick={() => setShowSampleModal(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 m-auto w-[600px] h-[500px] bg-white dark:bg-dark-200 rounded-xl shadow-xl z-[70] flex flex-col"
                  >
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-100">
                      <h3 className="text-lg font-lato font-semibold text-gray-900 dark:text-white">
                        Sample Schema
                      </h3>
                      <button
                        onClick={() => setShowSampleModal(false)}
                        className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 p-4 overflow-auto">
                      <pre className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {JSON.stringify(
                          {
                            type: "object",
                            properties: {
                              new_time: {
                                type: "string",
                                description: "The new time",
                              },
                              Laptop: {
                                type: "object",
                                properties: {
                                  Screen_size: {
                                    type: "string",
                                    description: "Size of the screen",
                                  },
                                  operating_system: {
                                    type: "string",
                                    description: "Version of the OS",
                                  },
                                },
                                required: ["Screen_size", "operating_system"],
                                description: "Brand of the laptop",
                              },
                              new_date: {
                                type: "string",
                                description: "The new booking date",
                              },
                              country_user: {
                                type: "array",
                                items: {
                                  type: "string",
                                  description: "Interests",
                                },
                                description: "User's interests",
                              },
                            },
                            required: [
                              "new_time",
                              "Laptop",
                              "new_date",
                              "country_user",
                            ],
                            description:
                              "Type of parameters from the transcript",
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                    <div className="p-4 border-t border-gray-200 dark:border-dark-100">
                      <button
                        onClick={() => {
                          handleJsonChange(
                            JSON.stringify(
                              {
                                type: "object",
                                properties: {
                                  new_time: {
                                    type: "string",
                                    description: "The new time",
                                  },
                                  Laptop: {
                                    type: "object",
                                    properties: {
                                      Screen_size: {
                                        type: "string",
                                        description: "Size of the screen",
                                      },
                                      operating_system: {
                                        type: "string",
                                        description: "Version of the OS",
                                      },
                                    },
                                    required: [
                                      "Screen_size",
                                      "operating_system",
                                    ],
                                    description: "Brand of the laptop",
                                  },
                                  new_date: {
                                    type: "string",
                                    description: "The new booking date",
                                  },
                                  country_user: {
                                    type: "array",
                                    items: {
                                      type: "string",
                                      description: "Interests",
                                    },
                                    description: "User's interests",
                                  },
                                },
                                required: [
                                  "new_time",
                                  "Laptop",
                                  "new_date",
                                  "country_user",
                                ],
                                description:
                                  "Type of parameters from the transcript",
                              },
                              null,
                              2,
                            ),
                          );
                          setShowSampleModal(false);
                        }}
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 font-lato font-semibold transition-colors"
                      >
                        Use This Schema
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};