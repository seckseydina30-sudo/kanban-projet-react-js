import React, { useEffect, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import { getToken } from "../auth";

const API = "http://localhost:1337/api/taches";



// ─── Strapi helpers ───────────────────────────────────────────────────────────

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiUpdate(id, data) {
  const res = await fetch(`${API}/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`PUT ${id} failed: ${res.status}`);
}

async function apiDelete(id) {
  const res = await fetch(`${API}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE ${id} failed: ${res.status}`);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function KanbanBoard() {
  const [incompleted, setIncompleted] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [backlog, setBacklog] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

useEffect(() => {
  fetch(API)
    .then((r) => r.json())
    .then((json) => {
      let tasks = json.data.map((item) => ({
        id: item.id,
        ...item.attributes,
      }));

      // Trier avant de répartir
      tasks = tasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      setIncompleted(tasks.filter((t) => !t.completed && !t.isBacklog));
      setCompleted(tasks.filter((t) => t.completed));
      setBacklog(tasks.filter((t) => !t.completed && t.isBacklog));
    })
    .catch((err) => console.error("Error connecting to Strapi:", err));
}, []);



  // ─── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    // Optimistically remove from UI immediately
    setIncompleted((prev) => prev.filter((t) => t.id !== id));
    setCompleted((prev) => prev.filter((t) => t.id !== id));
    setBacklog((prev) => prev.filter((t) => t.id !== id));

    try {
      await apiDelete(id);
    } catch (err) {
      console.error("Failed to delete task from Strapi:", err);
    }
  };

  // ─── Add task ──────────────────────────────────────────────────────────────

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    setIsSubmitting(true);

    const payload = {
      data: {
        title: newTitle.trim(),
        description: newDescription.trim(),
        completed: false,
        isBacklog: false,
      },
    };

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("POST failed");
      const json = await res.json();
      const newTask = { id: json.data.id, ...json.data.attributes };
      setIncompleted((prev) => [...prev, newTask]);
    } catch (err) {
      console.error("Error creating task:", err);
      setIncompleted((prev) => [
        ...prev,
        {
          id: Date.now(),
          title: newTitle.trim(),
          description: newDescription.trim(),
          completed: false,
          isBacklog: false,
        },
      ]);
    } finally {
      setNewTitle("");
      setNewDescription("");
      setShowModal(false);
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

  // ─── Drag & drop (with Strapi persistence) ────────────────────────────────
const handleDragEnd = async (result) => {
  const { destination, source, draggableId } = result;
  if (!destination) return;

  if (
    source.droppableId === destination.droppableId &&
    source.index === destination.index
  ) {
    return;
  }

  const lists = {
    "1": { list: incompleted, set: setIncompleted },
    "2": { list: completed, set: setCompleted },
    "3": { list: backlog, set: setBacklog },
  };

  const sourceList = lists[source.droppableId].list;
  const setSourceList = lists[source.droppableId].set;

  const destList = lists[destination.droppableId].list;
  const setDestList = lists[destination.droppableId].set;

  // Clone
  const newSourceList = [...sourceList];
  const taskIndex = newSourceList.findIndex(
    (t) => t.id.toString() === draggableId
  );
  const [movedTask] = newSourceList.splice(taskIndex, 1);

  // Update status
  if (destination.droppableId === "2") {
    movedTask.completed = true;
    movedTask.isBacklog = false;
  } else if (destination.droppableId === "3") {
    movedTask.completed = false;
    movedTask.isBacklog = true;
  } else {
    movedTask.completed = false;
    movedTask.isBacklog = false;
  }

  // Insert into destination
  const newDestList = [...destList];
  newDestList.splice(destination.index, 0, movedTask);

  // Recalculate positions
  const updatePositions = (list) =>
    list.map((t, index) => ({ ...t, position: index }));

  // Update UI
  setSourceList(updatePositions(newSourceList));
  setDestList(updatePositions(newDestList));

  // Persist to Strapi
  try {
    await apiUpdate(movedTask.id, {
      completed: movedTask.completed,
      isBacklog: movedTask.isBacklog,
      position: destination.index,
    });
  } catch (err) {
    console.error("Failed to update task:", err);
  }
};



        // Styles du modal
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.55)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backdropFilter: "blur(4px)",
  zIndex: 1000,
};

const modalStyle = {
  backgroundColor: "#4e345a",
  padding: "26px",
  borderRadius: "14px",
  width: "380px",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.35)",
  border: "1px solid #030405",
};

const labelStyle = {
  color: "#e0e1dd",
  fontSize: "14px",
  fontWeight: "600",
  marginBottom: "6px",
  display: "block",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #300e30",
  backgroundColor: "#15091a",
  color: "#e0e1dd",
  fontSize: "14px",
  outline: "none",
};

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <h2 style={{ textAlign: "center", color: "#e0e1dd" }}>PROGRESS BOARD</h2>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexDirection: "row",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <Column
          title="TO DO"
          tasks={incompleted}
          id="1"
          onDelete={handleDelete}
        />
        <Column title="DONE" tasks={completed} id="2" onDelete={handleDelete} />
        <Column
          title="BACKLOG"
          tasks={backlog}
          id="3"
          onDelete={handleDelete}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "10px 24px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#53077b",
            color: "#e0e1dd",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            letterSpacing: "0.5px",
          }}
        >
          + Add A Task
        </button>
      </div>

      {/* ── Modal ── */}
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
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1px solid #b984c8",
                  backgroundColor: "transparent",
                  color: "#a8b2c1",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTitle.trim() || isSubmitting}
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: newTitle.trim() ? "#53077b" : "#2a3a4a",
                  color: newTitle.trim() ? "#ffffff" : "#5a6a7a",
                  cursor: newTitle.trim() ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                {isSubmitting ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DragDropContext>
  );
}
