import axios from 'axios';

async function test() {
  try {
    // 1. Register a user so we know the password
    const email = `test_${Date.now()}@test.com`;
    console.log("Registering:", email);
    const regRes = await axios.post("http://localhost:5000/api/auth/register", {
      name: "Test User",
      email: email,
      password: "password123",
      role: "interviewer"
    });
    
    // 2. Login to get token
    console.log("Logging in...");
    const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
      email: email,
      password: "password123" 
    });
    
    const token = loginRes.data.token;
    console.log("Got token.");

    // 3. Create room
    console.log("Creating room...");
    const createRes = await axios.post("http://localhost:5000/api/interviews/create-room", {
      candidateEmail: `candidate_${Date.now()}@test.com`,
      language: "javascript"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Success:", createRes.data);
  } catch (err) {
    if (err.response) {
      console.log("Error status:", err.response.status);
      console.log("Error data:", err.response.data);
    } else {
      console.log("Error message:", err.message);
    }
  }
}

test();
