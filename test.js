// ai-test-generator/server/index.js

const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Groq } = require('groq-sdk');
require('dotenv').config();

const app = express();
const PORT = 5000;

const groq = new Groq({ apiKey:"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" });

app.use(bodyParser.json());

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

function stripBackticks(codeBlock) {
  let stripped = codeBlock.replace(/^```(?:\w+)?\n/, '');
  stripped = stripped.replace(/```$/, '');
  return stripped.trim();
}

app.post('/generate-tests', async (req, res) => {
  const { code, language } = req.body;
  if (!code || !language) return res.status(400).json({ error: 'Missing code or language' });

  const testPrompt = `Given the following ${language} code:\n\n${code}\n\nGenerate unit tests using unittest. Include necessary imports or define the function if needed. ONLY provide code (no explanations or backticks).`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: testPrompt }],
      temperature: 0.3,
    });

    let testCode = completion.choices[0].message.content;
    testCode = stripBackticks(testCode);

    const filename = `code_${Date.now()}`;
    const combinedPath = path.join(TEMP_DIR, `${filename}_combined.py`);

    // Write both original code and tests to a single file
    fs.writeFileSync(combinedPath, `${code}\n\n${testCode}`);

    // Run the tests using pytest
    exec(`pytest ${combinedPath} --tb=short --maxfail=5 --disable-warnings --json-report`, (err, stdout, stderr) => {
      res.json({
        success: !err,
        output: stdout,
        error: stderr,
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Test generation failed' });
  }
});

app.listen(PORT, () => console.log(`AI Test Generator API running on port ${PORT}`));