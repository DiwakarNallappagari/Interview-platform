# ngrok Setup – Share Link from Anywhere

## One-time: Add your ngrok auth token

In **Command Prompt** or **PowerShell** run (use your token from ngrok dashboard):

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

Get your token: https://dashboard.ngrok.com/get-started/your-authtoken

---

## Run the app and expose it with ngrok

1. **Start the project** (backend + frontend):
   ```bash
   npm run dev
   ```
   Backend runs on `http://localhost:5000`, frontend on `http://localhost:5173`.

2. **Expose with ngrok** (new terminal):
   - To share **frontend** (candidates open the app in browser):
     ```bash
     ngrok http 5173
     ```
   - Or if you run **backend only** and it serves the built frontend:
     ```bash
     ngrok http 5000
     ```

3. **Copy the ngrok URL** (e.g. `https://xxxx.ngrok-free.app`).

4. **Use the app** at that URL. When you click **Invite Candidate**, the invite link will use the same URL you’re on, so the link works for anyone you share it with.

---

## Invite link

- The invite link in the app is built from **the URL in your browser**.
- If you open the app via the ngrok link, the invite link will be that ngrok link + room path → candidates can open it from anywhere.
