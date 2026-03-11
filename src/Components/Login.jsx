import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormGroup, Button, Input } from "reactstrap";
import axios from "axios";
import { toast } from "react-toastify";
import { storeUser } from "../auth";
import { useTheme } from "../ThemeContext"; // <-- AJOUT

const initialUser = { password: "", identifier: "" };

const Login = () => {
  const [user, setUser] = useState(initialUser);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme(); // <-- AJOUT

  const handleChange = ({ target }) => {
    const { name, value } = target;
    setUser((currentUser) => ({
      ...currentUser,
      [name]: value,
    }));
  };

  const handleLogin = async () => {
    const url = `http://localhost:1337/api/auth/local`;
    try {
      if (user.identifier && user.password) {
        const { data } = await axios.post(url, user);
        if (data.jwt) {
          storeUser(data);
          toast.success("Logged in Successfully", { hideProgressBar: true });
          setUser(initialUser);
          navigate("/Home");
        }
      }
    } catch (error) {
      toast.error(error.message, { hideProgressBar: true });
    }
  };

  return (
    <div className="login-wrapper">
      {/* Bouton Dark/Light */}
      <div className="theme-toggle-wrapper">
        <Button onClick={toggleTheme} className="btn-secondary">
          {theme === "light" ? "Mode sombre" : "Mode clair"}
        </Button>
      </div>

      <div className="login-box">
        <h2>Login</h2>

        <FormGroup>
          <Input
            type="email"
            name="identifier"
            value={user.identifier}
            onChange={handleChange}
            placeholder="Enter your email"
          />
        </FormGroup>

        <FormGroup>
          <Input
            type="password"
            name="password"
            value={user.password}
            onChange={handleChange}
            placeholder="Enter your password"
          />
        </FormGroup>

        <Button className="btn-primary" onClick={handleLogin}>
          Login
        </Button>

        <h6 style={{ marginTop: "15px", textAlign: "center" }}>
          Click <Link to="/Registration">Here</Link> to sign up
        </h6>
      </div>
    </div>
  );
};

export default Login;
