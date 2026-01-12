import React, { useState, useRef } from "react";

const ResumeAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    setError("");
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setAnalysis(null);
      console.log("Selected file:", uploadedFile.name, uploadedFile.size, uploadedFile.type);
    }
  };

  const analyzeResume = async () => {
    setError("");
    if (!file) {
      setError("Please choose a resume file first.");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);
    console.log("Starting analysis for:", file.name);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const resp = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        body: formData,
      });

      console.log("HTTP status:", resp.status);

      const raw = await resp.text();
      console.log("Raw backend response:", raw);

      let parsed;
      try {
        const json = JSON.parse(raw);
        console.log("Parsed main JSON:", json);

        if (json.analysis !== undefined) {
          if (typeof json.analysis === "string") {
            try {
              parsed = JSON.parse(json.analysis);
              console.log("Parsed nested analysis:", parsed);
            } catch {
              parsed = json.analysis;
              console.log("analysis is plain string");
            }
          } else {
            parsed = json.analysis;
          }
        } else {
          parsed = json;
        }
      } catch {
        console.log("Top-level JSON parse failed. Returning raw text.");
        parsed = raw;
      }

      setAnalysis(parsed);
      console.log("Final Analysis:", parsed);
    } catch (err) {
      console.error("Error calling backend:", err);
      setError("Network or server error. Check console.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Section */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx"
          className="hidden"
        />

        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l4 4h-3v6H11V6H8l4-4zM6 8h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8z"/>
          </svg>
        </div>

        <h3 className="text-2xl font-semibold text-white mb-2">Upload Your Resume</h3>
        <p className="text-gray-400 mb-6">Support for PDF, DOC, and DOCX files</p>

        <div className="flex justify-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Choose File
          </button>

          <button
            onClick={analyzeResume}
            disabled={analyzing}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {analyzing ? "Analyzing..." : "Analyze Resume"}
          </button>
        </div>

        {file && <div className="mt-4 text-gray-300">Selected: {file.name}</div>}
        {error && <div className="mt-4 text-red-400">{error}</div>}
      </div>

      {/* Result Section */}
      <div>
        {analysis ? (
          typeof analysis === "string" ? (
            <div className="bg-white/5 p-6 rounded-xl">
              <h4 className="text-white font-semibold mb-2">Raw Response</h4>
              <pre className="text-gray-300 whitespace-pre-wrap">{analysis}</pre>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Score */}
              {analysis.score !== undefined && (
                <div className="bg-white/5 p-6 rounded-xl text-center">
                  <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                    {analysis.score}%
                  </div>
                  <div className="text-gray-400">Overall Resume Score</div>
                </div>
              )}

              {/* Strengths */}
              {Array.isArray(analysis.strengths) && (
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-white font-semibold mb-3">Strengths</h3>
                  <ul className="list-disc list-inside text-gray-300">
                    {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {Array.isArray(analysis.improvements) && (
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-white font-semibold mb-3">Improvements</h3>
                  <ul className="list-disc list-inside text-gray-300">
                    {analysis.improvements.map((i, idx) => <li key={idx}>{i}</li>)}
                  </ul>
                </div>
              )}

              {/* Keywords */}
              {Array.isArray(analysis.keywords) && (
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-white font-semibold mb-3">Detected Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.map((kw, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white/5 rounded text-gray-300">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full JSON */}
              <div className="bg-white/5 p-4 rounded-xl">
                <h4 className="text-white font-semibold mb-2">Full JSON</h4>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(analysis, null, 2)}
                </pre>
              </div>
            </div>
          )
        ) : (
          <div className="text-gray-400">No analysis yet.</div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalyzer;
