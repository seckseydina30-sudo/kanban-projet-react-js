import React, { useEffect, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";

export default function KanbanBoard() {
  const [incompleted, setIncompleted] = useState([]); // ID: 1 (TO DO)
  const [completed, setCompleted] = useState([]); // ID: 2 (DONE)
  const [backlog, setBacklog] = useState([]); // ID: 3 (BACKLOG)

  useEffect(() => {
    fetch("http://localhost:1337/api/taches")
      .then((response) => response.json())
      .then((json) => {
        const formattedTasks = json.data.map((item) => ({
          id: item.id,
          ...item.attributes,
        }));

        // 3. Filter and set state just like before
        setIncompleted(
          formattedTasks.filter((task) => !task.completed && !task.isBacklog),
        );
        setCompleted(formattedTasks.filter((task) => task.completed));
        setBacklog(
          formattedTasks.filter((task) => !task.completed && task.isBacklog),
        );
      })
      .catch((error) => console.error("Error connecting to Strapi:", error));
  }, []);

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    let sourceList, setSourceList;
    let destList, setDestList;

    // -- ASSIGN SOURCE --
    if (source.droppableId === "1") {
      sourceList = incompleted;
      setSourceList = setIncompleted;
    } else if (source.droppableId === "2") {
      sourceList = completed;
      setSourceList = setCompleted;
    } else {
      sourceList = backlog;
      setSourceList = setBacklog;
    }

    // -- ASSIGN DESTINATION --
    if (destination.droppableId === "1") {
      destList = incompleted;
      setDestList = setIncompleted;
    } else if (destination.droppableId === "2") {
      destList = completed;
      setDestList = setCompleted;
    } else {
      destList = backlog;
      setDestList = setBacklog;
    }

    const newSourceList = sourceList.filter(
      (task) => task.id.toString() !== draggableId,
    );
    setSourceList(newSourceList);

    const task = sourceList.find((task) => task.id.toString() === draggableId);

    let updatedTask = { ...task };
    if (destination.droppableId === "2") {
      updatedTask.completed = true;
      updatedTask.isBacklog = false;
    } else if (destination.droppableId === "3") {
      updatedTask.completed = false;
      updatedTask.isBacklog = true;
    } else {
      // ID 1 (To Do)
      updatedTask.completed = false;
      updatedTask.isBacklog = false;
    }

    if (source.droppableId !== destination.droppableId) {
      const newDestList = Array.from(destList);
      newDestList.splice(destination.index, 0, updatedTask);
      setDestList(newDestList);
    } else {
      const newDestList = Array.from(sourceList);
      newDestList.splice(source.index, 1);
      newDestList.splice(destination.index, 0, updatedTask);
      setDestList(newDestList);
    }
  };

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
        <Column title={"TO DO"} tasks={incompleted} id="1" />
        <Column title={"DONE"} tasks={completed} id="2" />
        <Column title={"BACKLOG"} tasks={backlog} id="3" />
      </div>
      <div>
        <button>Add A Task</button>
      </div>
    </DragDropContext>
  );
}
