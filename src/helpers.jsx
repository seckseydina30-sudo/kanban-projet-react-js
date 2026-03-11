import React from "react";
import { Navigate } from "react-router-dom";
import { userData } from "./auth";

export const Protector = ({ Component }) => {
  const { jwt } = userData();

  if (!jwt) return <Navigate to="/login" replace />;

  return <Component />;
};
