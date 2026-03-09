import React from "react";
import CustomNav from "./CustomNav";
import { userData } from "../auth.js";
import KanbanBoard from "./KanbanBoard";

const Home = () => {
  const { username } = userData();
  return (
    <div>
      <CustomNav />
      <div className="home">
        <h2> Welcome {username} </h2>
        <KanbanBoard />
      </div>
    </div>
  );
};

export default Home;
