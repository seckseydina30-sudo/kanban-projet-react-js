import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  Col,
  Row,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  FormText,
} from "reactstrap";
const initialUser = { email: "", password: "", username: "" };

const Registration = () => {
  const [user, setUser] = useState({ email: "", password: "", username: "" });
  const navigate = useNavigate();
  const signUp = async () => {
    try {
      const url = `http://localhost:1337/api/auth/local/register`;
      if (user.username && user.email && user.password) {
        const res = await axios.post(url, user);
        console.log(res);
        if (res) {
          setUser(initialUser);
          navigate("/login");
        }
      }
    } catch (error) {
      toast.error(error.message, {
        hideProgressBar: true,
      });
    }
  };
  const handleUserChange = ({ target }) => {
    const { name, value } = target;
    setUser((currentUser) => ({
      ...currentUser,
      [name]: value,
    }));
  };
return (
  <div className="register-wrapper">
    <div className="register">
      <h2>Sign up</h2>

      <FormGroup>
        <Input
          type="text"
          name="username"
          value={user.username}
          onChange={handleUserChange}
          placeholder="Enter your Fullname"
        />
      </FormGroup>

      <FormGroup>
        <Input
          type="email"
          name="email"
          value={user.email}
          onChange={handleUserChange}
          placeholder="Enter your email"
        />
      </FormGroup>

      <FormGroup>
        <Input
          type="password"
          name="password"
          value={user.password}
          onChange={handleUserChange}
          placeholder="Enter your password"
        />
      </FormGroup>

      <Button color="primary" onClick={signUp} style={{ width: "100%", marginBottom: "10px" }}>
        Sign Up
      </Button>

      {/* 🔙 Bouton Retour */}
      <Button
        color="secondary"
        onClick={() => navigate("/login")}
        style={{ width: "100%" }}
      >
        return
      </Button>
    </div>
  </div>
);
};
export default Registration;
