import React, { useEffect, useState } from "react";
import API from "../utils/api";

const Dashboard = () => {

  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const res = await API.get("/interviews");
      setInterviews(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div style={{ padding: "30px", background: "#f3f4f6", minHeight: "100vh" }}>
      {interviews.length === 0 ? (
        <p>No interviews yet</p>
      ) : (
        interviews.map((interview) => (
          <div key={interview._id}>{interview.roomId}</div>
        ))
      )}
    </div>
  );
};

export default Dashboard;