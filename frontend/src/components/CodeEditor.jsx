import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import socket from "../utils/socket";   // ✅ FIXED (default import)
import API from "../utils/api";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "sql", label: "SQL" },
];

const CodeEditor = ({ roomId }) => {
  const [code, setCode] = useState("// Start coding here...\n");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [stdin, setStdin] = useState("");

  useEffect(() => {
    // Receive code updates
    socket.on("receive-code", (data) => {
      setCode(data.code);
    });

    // Receive language change
    socket.on("language-change", (data) => {
      setLanguage(data.language);
    });

    return () => {
      socket.off("receive-code");
      socket.off("language-change");
    };
  }, []);

  const handleCodeChange = (value) => {
    setCode(value || "");
    socket.emit("code-change", {
      roomId,
      code: value,
    });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);

    socket.emit("language-change", {
      roomId,
      language: newLanguage,
    });
  };

  const handleRunCode = async () => {
    setRunning(true);
    setOutput(null);

    try {
      const resp = await API.post(`/interviews/${roomId}/run`, {
        code,
        language,
        stdin,
      });

      setOutput(resp.data);
    } catch (err) {
      setOutput({
        error: err.response?.data?.message || err.message,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col h-full">
      
      {/* Header */}
      <div className="bg-gray-700 p-4 flex justify-between items-center border-b border-gray-600">
        <h2 className="text-white font-semibold">Code Editor</h2>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="bg-gray-600 text-white px-3 py-1 rounded border border-gray-500 focus:outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleRunCode}
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:opacity-50"
            disabled={running}
          >
            {running ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      {/* Output + stdin */}
      <div className="bg-gray-900 px-4 py-3 border-t border-gray-600">
        <div className="flex gap-2 items-start">
          
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="stdin (optional)"
            className="w-1/3 bg-gray-800 text-white p-2 rounded border border-gray-700 h-20"
          />

          <div className="flex-1 bg-gray-800 p-3 rounded border border-gray-700 text-sm text-white">
            <div className="font-semibold mb-1">Output</div>

            {output ? (
              <pre className="whitespace-pre-wrap text-xs">
                {output.stdout ||
                 output.stderr ||
                 output.compile_output ||
                 output.error ||
                 JSON.stringify(output, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-400">
                No output yet. Click Run to execute.
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-400">
          Auto-saving every 5 seconds...
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;