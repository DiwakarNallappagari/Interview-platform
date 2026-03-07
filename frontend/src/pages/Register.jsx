import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Register = () => {

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [role,setRole] = useState("interviewer");

  const handleSubmit = async (e) => {

    e.preventDefault();

    try{

      await register(name,email,password,role);

      navigate("/dashboard");

    }catch(err){

      console.log("Register error:", err.response?.data);

      alert(err.response?.data?.message || "Register failed");

    }

  };

  return (

    <div className="h-screen flex items-center justify-center bg-gray-100">

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-80">

        <h2 className="text-xl font-bold mb-4 text-center">Register</h2>

        {/* NAME */}
        <label className="text-sm font-medium">Name</label>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          className="w-full p-2 border mb-3 rounded"
          required
        />

        {/* EMAIL */}
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="w-full p-2 border mb-3 rounded"
          required
        />

        {/* PASSWORD */}
        <label className="text-sm font-medium">Password</label>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="w-full p-2 border mb-3 rounded"
          required
        />

        {/* ROLE */}
        <label className="text-sm font-medium">Role</label>
        <select
          value={role}
          onChange={(e)=>setRole(e.target.value)}
          className="w-full p-2 border mb-4 rounded"
        >
          <option value="interviewer">Interviewer</option>
          <option value="candidate">Candidate</option>
        </select>

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
          Register
        </button>

      </form>

    </div>

  );

};

export default Register;