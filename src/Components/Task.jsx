import React, { useState } from "react"; // Fixed typo here
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
`;

function bgcolorChange(props) {
  // 1. If dragging, show gray/silver
  if (props.isDragging) return "#c6c9bd";

  // 2. If user clicked the button, use that specific color
  if (props.userColor) return props.userColor;

  // 3. Otherwise use default Backlog (pinkish) or ToDo (yellowish) colors
  return "lightblue";
}

export default function Task({ task, index }) {
  const [myColor, setMyColor] = useState(null);

  const handleColorChange = () => {
    if (myColor === "#ef233c") {
      setMyColor(null);
    } else {
      setMyColor("#ef233c");
    }
  };

  return (
    <Draggable draggableId={`${task.id}`} key={task.id} index={index}>
      {(provided, snapshot) => (
        <Container
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          isDragging={snapshot.isDragging}
          isBacklog={task.isBacklog}
          userColor={myColor} // Pass the state to the style
        >
          <div style={{ display: "flex", justifyContent: "start", padding: 2 }}>
            <span>
              <small>#{task.id} </small>
            </span>
          </div>

          <div
            style={{ display: "flex", justifyContent: "center", padding: 2 }}
          >
            <TextContent>{task.title}</TextContent>
          </div>

          {/* The Button to trigger the color change */}
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 10 }}
          ></div>
          <button onClick={handleColorChange} className="change-col">
            Marquer Comme Important
          </button>

          {provided.placeholder}
        </Container>
      )}
    </Draggable>
  );
}
