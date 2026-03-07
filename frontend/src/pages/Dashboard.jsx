import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
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
    <>
      <Navbar />

      <div className="p-6">

        {interviews.length === 0 ? (
          <p>No interviews yet</p>
        ) : (
          interviews.map((interview) => (
            <div key={interview._id}>
              {interview.roomId}
            </div>
          ))
        )}

      </div>
    </>
  );
};

export default Dashboard;