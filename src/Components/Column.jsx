// import React from "react";
// import { Droppable } from "@hello-pangea/dnd"; // removed unused Draggable for now
// import styled from "styled-components";
// import "./scroll.css";
// import Task from "./Task";
// const Container = styled.div`
//   background-color: #f5f2c7f0;
//   border-radius: 10px;
//   max-width: 350px;
//   height: 600px;
//   overflow-y: scroll;
//   -ms-overflow-style: none;
//   scrollbar-width: none;
//   border: 2px solid gray;
// `;

// const Title = styled.h3`
//   padding: 8px;
//   text-align: center;
//   margin: 0;
// `;

// const TaskList = styled.div`
//   padding: 3px;
//   transition: background-color 0.2s ease;
//   background-color: rgb(153, 0, 0);
//   flex-grow: 1;
//   min-height: 100px;
// `;

// export default function Column({ title, tasks, id }) {
//   return (
//     <Container className="column">
//       <Title
//         style={{
//           backgroundColor: "lightblue",
//           position: "sticky",
//           top: 0,
//           padding: 15,
//         }}
//       >
//         {title}
//       </Title>

//       <Droppable droppableId={id}>
//         {(provided, snapshot) => (
//           <TaskList
//             ref={provided.innerRef}
//             {...provided.droppableProps}
//             isDraggingOver={snapshot.isDraggingOver}
//           >
//             {/* {Provide Your Tasks} */}
//             {tasks.map((task, index) => (
//               <Task key={task.id} index={index} task={task} />
//             ))}

//             {provided.placeholder}
//           </TaskList>
//         )}
//       </Droppable>
//     </Container>
//   );
// }
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
  max-width: 350px;
  height: 450px;
  overflow-y: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;
  border: 2px solid
    ${({ themeMode }) => (themeMode === "dark" ? "#444" : "#ebb5be")};
`;

const Title = styled.h3`
  color: ${({ themeMode }) => (themeMode === "dark" ? "#f1f1f1" : "#ffffff")};
  padding: 15px;
  text-align: center;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 10;
  font-weight: 600;
  background-color: ${({ themeMode }) =>
    themeMode === "dark" ? "#111" : "#111111"};
`;

const TaskList = styled.div`
  padding: 8px;
  flex-grow: 1;
  min-height: 100px;

`;


export default function Column({ title, tasks, id, onDelete }) {
  const { theme } = useTheme();
  return (
    <Container className="column" themeMode={theme}>
  <Title themeMode={theme}>{title}</Title>

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
