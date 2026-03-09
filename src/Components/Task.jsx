import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import styled from "styled-components";

const TextContent = styled.div``;

const Container = styled.div`
  border-radius: 10px;
  padding: 8px;
  color: #000;
  margin-bottom: 8px;
  min-height: 120px;
  margin-left: 10px;
  margin-right: 10px;
  background-color: ${(props) => bgcolorChange(props)};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  transition: background-color 0.5s ease;
  position: relative;
`;

function bgcolorChange(props) {
  if (props.isDragging) return "#ffffff";
  if (props.userColor) return props.userColor;
  return "#9b6598";
}

export default function Task({ task, index, onDelete }) {
  const [myColor, setMyColor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleColorChange = () => {
    setMyColor((prev) => (prev === "#ebb5be" ? null : "#ebb5be"));
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    onDelete(task.documentId);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };

  return (
    <Draggable
      draggableId={`${task.documentId}`}
      key={task.documentId}
      index={index}
    >
      {(provided, snapshot) => (
        <Container
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          isDragging={snapshot.isDragging}
          isBacklog={task.isBacklog}
          userColor={myColor}
        >
          {/* Top row: task ID + delete button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 2,
            }}
          >
            <span>
              <small>#{task.documentId}</small>
            </span>
            <button
              onClick={handleDeleteClick}
              title="Delete task"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#000000",
                fontSize: "20px",
                lineHeight: 1,
                padding: "2px 4px",
                borderRadius: "4px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(192,57,43,0.12)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              ✕
            </button>
          </div>

          {/* Title */}
          <div
            style={{ display: "flex", justifyContent: "center", padding: 2 }}
          >
            <TextContent>{task.title}</TextContent>
          </div>

          {/* Mark as important */}
          <button onClick={handleColorChange} className="change-col">
            Marquer Comme Important
          </button>

          {/* Inline delete confirmation */}
          {confirmDelete && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "10px",
                backgroundColor: "rgba(237, 230, 230, 0.93)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "12px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                  color: "#333",
                  textAlign: "center",
                }}
              >
                Delete this task?
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleConfirmDelete}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#c0392b",
                    color: "#2b2626",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={handleCancelDelete}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "6px",
                    border: "1px solid #aaa",
                    backgroundColor: "#faeded",
                    color: "#333",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {provided.placeholder}
        </Container>
      )}
    </Draggable>
  );
}
