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

async function apiUpdate(documentId, data) {
  const res = await fetch(`${API}/${documentId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`PUT ${documentId} failed: ${res.status}`);
}

async function apiDelete(documentId) {
  const res = await fetch(`${API}/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE ${documentId} failed: ${res.status}`);
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
    fetch(API, { headers: authHeaders() })
      .then((r) => r.json())
      .then((json) => {
        // Strapi v5: response is flat, no "attributes" wrapper
        let tasks = json.data.map(({ id, documentId, ...rest }) => ({
          id,
          documentId,
          ...rest,
        }));

        tasks = tasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        setIncompleted(tasks.filter((t) => !t.completed && !t.isBacklog));
        setCompleted(tasks.filter((t) => t.completed));
        setBacklog(tasks.filter((t) => !t.completed && t.isBacklog));
      })
      .catch((err) => console.error("Error connecting to Strapi:", err));
  }, []);

  // ─── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (documentId) => {
    setIncompleted((prev) => prev.filter((t) => t.documentId !== documentId));
    setCompleted((prev) => prev.filter((t) => t.documentId !== documentId));
    setBacklog((prev) => prev.filter((t) => t.documentId !== documentId));

    try {
      await apiDelete(documentId);
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
        position: incompleted.length, // Best practice to include this
      },
    };

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // THIS PART IS KEY: Get the error details from Strapi
        const errorData = await res.json();
        console.error("Strapi Error Details:", errorData.error);
        throw new Error(`POST failed: ${errorData.error.message}`);
      }

      const json = await res.json();
      const { id, documentId, ...rest } = json.data;
      const newTask = { id, documentId, ...rest };
      setIncompleted((prev) => [...prev, newTask]);

      // Reset form
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

  // ─── Drag & drop ──────────────────────────────────────────────────────────

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
      1: { list: incompleted, set: setIncompleted },
      2: { list: completed, set: setCompleted },
      3: { list: backlog, set: setBacklog },
    };

    const sourceList = lists[source.droppableId].list;
    const setSourceList = lists[source.droppableId].set;

    const destList = lists[destination.droppableId].list;
    const setDestList = lists[destination.droppableId].set;

    const newSourceList = [...sourceList];
    const taskIndex = newSourceList.findIndex(
      (t) => t.id.toString() === draggableId,
    );
    const [movedTask] = newSourceList.splice(taskIndex, 1);

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

    const newDestList = [...destList];
    newDestList.splice(destination.index, 0, movedTask);

    const updatePositions = (list) =>
      list.map((t, index) => ({ ...t, position: index }));

    const updatedSource = updatePositions(newSourceList);
    const updatedDest = updatePositions(newDestList);

    setSourceList(updatedSource);
    setDestList(updatedDest);

    try {
      const toSave =
        source.droppableId === destination.droppableId
          ? updatedDest
          : [...updatedSource, ...updatedDest];

      await Promise.all(
        toSave.map((t) =>
          apiUpdate(t.documentId, {
            completed: t.completed,
            isBacklog: t.isBacklog,
            position: t.position,
          }),
        ),
      );
    } catch (err) {
      console.error("Failed to update task positions:", err);
    }
  };

  // ─── Styles ───────────────────────────────────────────────────────────────

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
