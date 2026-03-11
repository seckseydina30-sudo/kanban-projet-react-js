import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import styled from "styled-components";
import "./scroll.css";
import Task from "./Task";
import { useTheme } from "../ThemeContext";

const Container = styled.div`
  background-color: ${({ themeMode }) =>
    themeMode === "dark" ? "rgba(20,20,20,0.85)" : "rgba(0,0,0,0.55)"};
  border-radius: 10px;
  width: 300px;
  min-width: 240px;
  height: 450px;
  overflow-y: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;
  border: 2px solid
    ${({ themeMode }) => (themeMode === "dark" ? "#444" : "#ebb5be")};
  flex-shrink: 0;
`;

const Header = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: ${({ themeMode }) =>
    themeMode === "dark" ? "#111" : "#111111"};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 0 15px;
  min-height: 50px;
`;

const Title = styled.h3`
  color: ${({ themeMode }) => (themeMode === "dark" ? "#f1f1f1" : "#ffffff")};
  margin: 0;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
  flex: 1;
  text-align: center;
`;

const DeleteColumnBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ themeMode }) => (themeMode === "dark" ? "#666" : "#888")};
  font-size: 16px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 6px;
  transition:
    color 0.2s ease,
    background 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: ${({ themeMode }) => (themeMode === "dark" ? "#ff5c5c" : "#d90429")};
    background: ${({ themeMode }) =>
      themeMode === "dark" ? "rgba(255,92,92,0.12)" : "rgba(217,4,41,0.1)"};
  }
`;

const TaskList = styled.div`
  padding: 8px;
  flex-grow: 1;
  min-height: 100px;
`;

export default function Column({ title, tasks, id, onDelete, onDeleteColumn }) {
  const { theme } = useTheme();

  const handleDeleteColumn = () => {
    const confirmed = window.confirm(
      `Delete column "${title}"? All tasks inside will be removed.`,
    );
    if (confirmed) onDeleteColumn(id);
  };

  return (
    <Container className="column" themeMode={theme}>
      <Header themeMode={theme}>
        {/* Spacer to balance the delete button and keep title centered */}
        <div style={{ width: 28 }} />

        <Title themeMode={theme}>{title}</Title>

        <DeleteColumnBtn
          themeMode={theme}
          onClick={handleDeleteColumn}
          title="Delete column"
        >
          ✕
        </DeleteColumnBtn>
      </Header>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <TaskList
            ref={provided.innerRef}
            {...provided.droppableProps}
            isDraggingOver={snapshot.isDraggingOver}
          >
            {tasks.map((task, index) => (
              <Task
                key={task.id}
                index={index}
                task={task}
                onDelete={onDelete}
              />
            ))}
            {provided.placeholder}
          </TaskList>
        )}
      </Droppable>
    </Container>
  );
}
