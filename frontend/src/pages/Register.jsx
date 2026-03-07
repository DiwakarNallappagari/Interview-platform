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

      alert("Register failed");

    }

  };

  return (

    <div className="h-screen flex items-center justify-center bg-gray-100">

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-80">

        <h2 className="text-xl font-bold mb-4">Register</h2>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          className="w-full p-2 border mb-3"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="w-full p-2 border mb-3"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="w-full p-2 border mb-3"
        />

        <select
          value={role}
          onChange={(e)=>setRole(e.target.value)}
          className="w-full p-2 border mb-3"
        >
          <option value="interviewer">Interviewer</option>
          <option value="candidate">Candidate</option>
        </select>

        <button className="w-full bg-blue-600 text-white py-2">
          Register
        </button>

      </form>

    </div>

  );

};

export default Register;