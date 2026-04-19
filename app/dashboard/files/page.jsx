"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");

  useEffect(() => {
    fetchFiles();
  }, []);

  async function fetchFiles() {
    setLoading(true);
    try {
      const res = await fetch("/api/files?action=list");
      const data = await res.json();
      setFiles(data.files || []);
      setError(data.error || "");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function viewFile(filename) {
    const res = await fetch(`/api/files?action=read&file=${encodeURIComponent(filename)}`);
    const data = await res.json();
    if (data.content !== undefined) {
      setSelectedFile(filename);
      setFileContent(data.content);
    }
  }

  async function deleteFile(filename) {
    if (!confirm(`Delete ${filename}?`)) return;
    await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    });
    fetchFiles();
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px" }}>
      <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Generated Files</h1>
          <p className="muted" style={{ marginTop: "6px" }}>Files created by the agent during runs</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => window.location.href = "/api/files/download?format=zip"}
            style={{
              padding: "8px 16px",
              borderRadius: "12px",
              border: "1px solid var(--accent)",
              background: "var(--accent-soft)",
              cursor: "pointer",
              color: "var(--accent)"
            }}
          >
            Download All (ZIP)
          </button>
          <button
            onClick={fetchFiles}
            style={{
              padding: "8px 16px",
              borderRadius: "12px",
              border: "1px solid var(--line)",
              background: "var(--panel)",
              cursor: "pointer"
            }}
          >
            Refresh
          </button>
          <Link
            href="/dashboard"
            style={{
              padding: "8px 16px",
              borderRadius: "12px",
              border: "1px solid var(--line)",
              background: "var(--panel)",
              textDecoration: "none",
              color: "var(--ink)"
            }}
          >
            Back to Studio
          </Link>
        </div>
      </header>

      {error && <div className="error-box" style={{ marginBottom: "16px" }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
      ) : files.length === 0 ? (
        <div className="surface" style={{ padding: "40px", textAlign: "center", borderRadius: "20px" }}>
          <p className="muted">No files generated yet. Run a task that creates code or files.</p>
          <Link
            href="/dashboard"
            className="primary-action"
            style={{ display: "inline-block", marginTop: "16px", textDecoration: "none" }}
          >
            Go to Studio
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* File List */}
          <div className="surface" style={{ padding: "20px", borderRadius: "20px" }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "16px" }}>Files ({files.length})</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {files.map((file) => (
                <div
                  key={file.name}
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    background: selectedFile === file.name ? "var(--accent-soft)" : "rgba(255,255,255,0.5)",
                    border: "1px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer"
                  }}
                  onClick={() => viewFile(file.name)}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{file.name}</div>
                    {file.size && (
                      <div className="muted" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                        {formatSize(file.size)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFile(file.name); }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--danger)",
                      fontSize: "0.85rem"
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* File Preview */}
          <div className="surface" style={{ padding: "20px", borderRadius: "20px" }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "16px" }}>
              {selectedFile || "Select a file to preview"}
            </h2>
            {selectedFile ? (
              <pre
                style={{
                  background: "rgba(0,0,0,0.05)",
                  padding: "16px",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  overflow: "auto",
                  maxHeight: "500px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}
              >
                {fileContent}
              </pre>
            ) : (
              <div className="muted" style={{ textAlign: "center", padding: "40px" }}>
                Click a file to view its contents
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}