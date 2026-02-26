import axios from 'axios'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

const LANGUAGE_MAP = {
  javascript: 63, // Node.js
  python: 71,     // Python 3
  java: 62,       // Java
  cpp: 54,        // C++
  c: 50           // C
}

// Local code execution fallback
async function runCodeLocally(code, language, stdin = '') {
  const tempDir = os.tmpdir()
  const timestamp = Date.now()
  
  try {
    let filename, command
    
    switch (language.toLowerCase()) {
      case 'javascript':
        filename = path.join(tempDir, `code_${timestamp}.js`)
        await fs.writeFile(filename, code)
        command = `node "${filename}"`
        break
        
      case 'python':
        filename = path.join(tempDir, `code_${timestamp}.py`)
        await fs.writeFile(filename, code)
        command = `python "${filename}"`
        break
        
      default:
        return {
          stdout: '',
          stderr: `Local execution not supported for ${language}. Please configure JUDGE0_API_KEY for full language support.`,
          status: { description: 'Unsupported' }
        }
    }
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
      input: stdin
    })
    
    // Clean up temp file
    await fs.unlink(filename).catch(() => {})
    
    return {
      stdout: stdout || '',
      stderr: stderr || '',
      status: { description: 'Accepted' }
    }
  } catch (err) {
    return {
      stdout: '',
      stderr: err.stderr || err.message,
      status: { description: 'Runtime Error' }
    }
  }
}

export async function runCodeOnJudge0(code, language = 'javascript', stdin = '') {
  const apiKey = process.env.JUDGE0_API_KEY

  // If no API key, use local execution
  if (!apiKey) {
    console.log('JUDGE0_API_KEY not configured, using local execution')
    return await runCodeLocally(code, language, stdin)
  }

  const language_id = LANGUAGE_MAP[language.toLowerCase()]

  if (!language_id) {
    throw new Error('Unsupported language')
  }

  const endpoint =
    'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true'

  const payload = {
    source_code: code,
    language_id,
    stdin: stdin || '',
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
  }

  const resp = await axios.post(endpoint, payload, { headers })

  return resp.data
}
// AI Interview Analysis (Temporary Version)
export async function analyzeInterview({ transcript = '', code = '', language = 'javascript' }) {
  return {
    technicalScore: 80,
    communicationScore: 75,
    confidenceScore: 70,
    suggestions: [
      "Explain your logic clearly",
      "Handle edge cases properly",
      "Improve variable naming"
    ]
  }
}
