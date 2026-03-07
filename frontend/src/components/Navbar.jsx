import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {

  const { user, logout } = useContext(AuthContext);

  return (
    <div
      style={{
        background: "#3567d6",
        color: "white",
        padding: "14px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <div style={{ fontWeight: "600", fontSize: "18px" }}>
        Interview Platform
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span>{user?.name}</span>

        <button
          onClick={logout}
          style={{
            background: "#ff4d4f",
            border: "none",
            color: "white",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;