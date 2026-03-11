import React, { useEffect, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import { getToken } from "../auth";
import { useTheme } from "../ThemeContext";

const API_TASKS = "http://localhost:1337/api/taches";
const API_COLUMNS = "http://localhost:1337/api/colonnes";

// ─── Strapi helpers ───────────────────────────────────────────────────────────

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiUpdateTask(documentId, data) {
  const res = await fetch(`${API_TASKS}/${documentId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`PUT task ${documentId} failed: ${res.status}`);
}

async function apiDeleteTask(documentId) {
  const res = await fetch(`${API_TASKS}/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok)
    throw new Error(`DELETE task ${documentId} failed: ${res.status}`);
}

async function apiCreateColumn(data) {
  const res = await fetch(API_COLUMNS, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`POST column failed: ${res.status}`);
  return res.json();
}

async function apiDeleteColumn(documentId) {
  const res = await fetch(`${API_COLUMNS}/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok)
    throw new Error(`DELETE column ${documentId} failed: ${res.status}`);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function KanbanBoard() {
  const { theme, toggleTheme } = useTheme();

  // Each column: { id, documentId, title, position }
  const [columns, setColumns] = useState([]);
  // Tasks keyed by column documentId
  const [tasksByColumn, setTasksByColumn] = useState({});

  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // ─── Fetch columns + tasks on mount ───────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // 1. Load columns
        const colRes = await fetch(API_COLUMNS, { headers: authHeaders() });
        const colJson = await colRes.json();

        const loadedColumns = colJson.data
          .map(({ id, documentId, ...rest }) => ({ id, documentId, ...rest }))
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        setColumns(loadedColumns);

        // 2. Load tasks
        const taskRes = await fetch(API_TASKS, { headers: authHeaders() });
        const taskJson = await taskRes.json();

        const tasks = taskJson.data
          .map(({ id, documentId, ...rest }) => ({ id, documentId, ...rest }))
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        // 3. Distribute tasks into columns
        const byCol = {};
        loadedColumns.forEach((col) => {
          byCol[col.documentId] = [];
        });

        tasks.forEach((task) => {
          // Prefer explicit columnId (set when dragging or creating)
          if (task.columnId && byCol[task.columnId] !== undefined) {
            byCol[task.columnId].push(task);
            return;
          }
          // Fallback: use legacy completed/isBacklog flags
          if (task.completed) {
            const col = loadedColumns.find((c) => c.title === "DONE");
            if (col) byCol[col.documentId].push(task);
          } else if (task.isBacklog) {
            const col = loadedColumns.find((c) => c.title === "BACKLOG");
            if (col) byCol[col.documentId].push(task);
          } else {
            const col = loadedColumns.find((c) => c.title === "TO DO");
            if (col) byCol[col.documentId].push(task);
          }
        });

        setTasksByColumn(byCol);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, []);

  // ─── Delete task ───────────────────────────────────────────────────────────

  const handleDelete = async (documentId) => {
    setTasksByColumn((prev) => {
      const updated = {};
      for (const colId in prev) {
        updated[colId] = prev[colId].filter((t) => t.documentId !== documentId);
      }
      return updated;
    });
    try {
      await apiDeleteTask(documentId);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // ─── Add task ──────────────────────────────────────────────────────────────

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    setIsSubmitting(true);

    const firstCol = columns[0];
    if (!firstCol) return;

    const payload = {
      data: {
        title: newTitle.trim(),
        description: newDescription.trim(),
        completed: false,
        isBacklog: false,
        columnId: firstCol.documentId,
        position: (tasksByColumn[firstCol.documentId] ?? []).length,
      },
    };

    try {
      const res = await fetch(API_TASKS, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Strapi Error:", errorData.error);
        throw new Error(`POST failed: ${errorData.error.message}`);
      }

      const json = await res.json();
      const { id, documentId, ...rest } = json.data;
      const newTask = { id, documentId, ...rest };

      setTasksByColumn((prev) => ({
        ...prev,
        [firstCol.documentId]: [...(prev[firstCol.documentId] ?? []), newTask],
      }));

      setNewTitle("");
      setNewDescription("");
      setShowModal(false);
    } catch (err) {
      console.error("Error creating task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
    if (e.key === "Escape") setShowModal(false);
  };

  // ─── Add column ────────────────────────────────────────────────────────────

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) return;

    const newColData = {
      title: newColumnTitle.trim().toUpperCase(),
      position: columns.length,
    };

    const tempId = `temp-${Date.now()}`;

    // Optimistic UI
    setColumns((prev) => [
      ...prev,
      { id: tempId, documentId: tempId, ...newColData },
    ]);
    setTasksByColumn((prev) => ({ ...prev, [tempId]: [] }));
    setNewColumnTitle("");
    setShowColumnModal(false);

    try {
      const json = await apiCreateColumn(newColData);
      const { id, documentId, ...rest } = json.data;
      const savedCol = { id, documentId, ...rest };

      // Swap temp entry for real Strapi entry
      setColumns((prev) =>
        prev.map((c) => (c.documentId === tempId ? savedCol : c)),
      );
      setTasksByColumn((prev) => {
        const tasks = prev[tempId] ?? [];
        const updated = { ...prev };
        delete updated[tempId];
        updated[savedCol.documentId] = tasks;
        return updated;
      });
    } catch (err) {
      console.error("Failed to save column:", err);
      // Rollback
      setColumns((prev) => prev.filter((c) => c.documentId !== tempId));
      setTasksByColumn((prev) => {
        const updated = { ...prev };
        delete updated[tempId];
        return updated;
      });
    }
  };

  const handleColumnKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddColumn();
    }
    if (e.key === "Escape") setShowColumnModal(false);
  };

  // ─── Delete column ─────────────────────────────────────────────────────────

  const handleDeleteColumn = async (colDocumentId) => {
    setColumns((prev) => prev.filter((c) => c.documentId !== colDocumentId));
    setTasksByColumn((prev) => {
      const updated = { ...prev };
      delete updated[colDocumentId];
      return updated;
    });
    try {
      await apiDeleteColumn(colDocumentId);
    } catch (err) {
      console.error("Failed to delete column from Strapi:", err);
    }
  };

  // ─── Drag & drop ──────────────────────────────────────────────────────────

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const srcId = source.droppableId; // column documentId
    const dstId = destination.droppableId; // column documentId

    const srcList = [...(tasksByColumn[srcId] ?? [])];
    const dstList =
      srcId === dstId ? srcList : [...(tasksByColumn[dstId] ?? [])];

    const taskIndex = srcList.findIndex((t) => t.id.toString() === draggableId);
    const [movedTask] = srcList.splice(taskIndex, 1);

    const destCol = columns.find((c) => c.documentId === dstId);
    movedTask.completed = destCol?.title === "DONE";
    movedTask.isBacklog = destCol?.title === "BACKLOG";
    movedTask.columnId = dstId;

    const targetList = srcId === dstId ? srcList : dstList;
    targetList.splice(destination.index, 0, movedTask);

    const withPositions = (list) =>
      list.map((t, index) => ({ ...t, position: index }));

    const updatedSrc = withPositions(srcList);
    const updatedDst = srcId === dstId ? updatedSrc : withPositions(dstList);

    setTasksByColumn((prev) => ({
      ...prev,
      [srcId]: updatedSrc,
      [dstId]: updatedDst,
    }));

    try {
      const toSave =
        srcId === dstId ? updatedDst : [...updatedSrc, ...updatedDst];
      await Promise.all(
        toSave.map((t) =>
          apiUpdateTask(t.documentId, {
            completed: t.completed,
            isBacklog: t.isBacklog,
            columnId: t.columnId,
            position: t.position,
          }),
        ),
      );
    } catch (err) {
      console.error("Failed to update positions:", err);
    }
  };

  // ─── Styles ───────────────────────────────────────────────────────────────

  const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: theme === "dark" ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(4px)",
    zIndex: 1000,
  };

  const modalStyle = {
    backgroundColor: theme === "dark" ? "#1a1a1a" : "#4e345a",
    padding: "26px",
    borderRadius: "14px",
    width: "380px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.35)",
    border: theme === "dark" ? "1px solid #333" : "1px solid #030405",
    color: theme === "dark" ? "#f1f1f1" : "#e0e1dd",
  };

  const labelStyle = {
    color: theme === "dark" ? "#f1f1f1" : "#e0e1dd",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "6px",
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: theme === "dark" ? "1px solid #555" : "1px solid #300e30",
    backgroundColor: theme === "dark" ? "#0f0f0f" : "#15091a",
    color: theme === "dark" ? "#f1f1f1" : "#e0e1dd",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  const cancelBtnStyle = {
    padding: "8px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "0.3s ease",
    backgroundColor: "transparent",
    border: theme === "dark" ? "1px solid #555" : "1px solid #b984c8",
    color: theme === "dark" ? "#cccccc" : "#a8b2c1",
  };

  const confirmBtnStyle = (active) => ({
    padding: "8px 18px",
    borderRadius: "6px",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    transition: "0.3s ease",
    background: active
      ? theme === "dark"
        ? "linear-gradient(135deg, #6a0dad, #3b0a57)"
        : "linear-gradient(135deg, #ff4d6d, #d90429)"
      : theme === "dark"
        ? "#2a2a2a"
        : "#2a3a4a",
    color: active ? "#ffffff" : theme === "dark" ? "#777777" : "#5a6a7a",
    cursor: active ? "pointer" : "not-allowed",
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        style={{
          textAlign: "center",
          color: "#e0e1dd",
          marginTop: "80px",
          fontSize: "16px",
        }}
      >
        Loading board...
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "20px",
          paddingRight: "20px",
        }}
      >
        <button
          onClick={toggleTheme}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            transition: "0.3s ease",
            color: "black",
            background:
              theme === "dark"
                ? "linear-gradient(135deg, #ffffff, #7e7e7e)"
                : "linear-gradient(135deg, #ff4d6d, #d90429)",
          }}
        >
          {theme === "light" ? "Mode sombre" : "Mode clair"}
        </button>
      </div>

      <h2 style={{ textAlign: "center", color: "#e0e1dd" }}>PROGRESS BOARD</h2>

      {/* Columns */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
        {columns.map((col) => (
          <Column
            key={col.documentId}
            title={col.title}
            tasks={tasksByColumn[col.documentId] ?? []}
            id={col.documentId}
            onDelete={handleDelete}
            onDeleteColumn={handleDeleteColumn}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginTop: 24,
          flexWrap: "wrap",
          padding: "0 12px",
        }}
      >
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "10px 24px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "600",
            letterSpacing: "0.5px",
            transition: "0.3s ease",
            background:
              theme === "dark"
                ? "linear-gradient(135deg, #ffffff, #ffffff)"
                : "linear-gradient(135deg, #6a0dad, #3b0a57)",
            color: theme === "dark" ? "black" : "white",
          }}
        >
          + Add Task
        </button>

        <button
          onClick={() => setShowColumnModal(true)}
          style={{
            padding: "10px 24px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "600",
            letterSpacing: "0.5px",
            transition: "0.3s ease",
            background:
              theme === "dark"
                ? "linear-gradient(135deg, #6a0dad, #3b0a57)"
                : "linear-gradient(135deg, #ff4d6d, #d90429)",
            color: "#ffffff",
          }}
        >
          + Add Column
        </button>
      </div>

      {/* ── Add Task Modal ── */}
      {showModal && (
        <div style={modalOverlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#e0e1dd", margin: 0, fontSize: "18px" }}>
              New Task
            </h3>
            <div>
              <label style={labelStyle}>Title *</label>
              <input
                autoFocus
                style={inputStyle}
                placeholder="Enter task title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                placeholder="Optional description..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={cancelBtnStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTitle.trim() || isSubmitting}
                style={confirmBtnStyle(!!newTitle.trim() && !isSubmitting)}
              >
                {isSubmitting ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Column Modal ── */}
      {showColumnModal && (
        <div
          style={modalOverlayStyle}
          onClick={() => setShowColumnModal(false)}
        >
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#e0e1dd", margin: 0, fontSize: "18px" }}>
              New Column
            </h3>
            <div>
              <label style={labelStyle}>Column Name *</label>
              <input
                autoFocus
                style={inputStyle}
                placeholder="e.g. IN REVIEW"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={handleColumnKeyDown}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowColumnModal(false)}
                style={cancelBtnStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                disabled={!newColumnTitle.trim()}
                style={confirmBtnStyle(!!newColumnTitle.trim())}
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}
    </DragDropContext>
  );
}
