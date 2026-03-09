import React from "react";
import { Container } from "reactstrap";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Home from "./Components/Home";
import Login from "./Components/Login";
import Logout from "./Components/Logout";
import Registration from "./Components/Registration";
import { Protector } from "./helpers";

function App() {
  return (
    <>
      <Container>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Protector Component={Home} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/registration" element={<Registration />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </Container>
    </>
  );
}

export default App;