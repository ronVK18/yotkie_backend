const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

let accessToken = '';
let cloudId = '';

// Step 1: Redirect user to this URL
app.get('/auth/jira', (req, res) => {
    const jiraAuthUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${process.env.CLIENT_ID}&scope=read%3Ajira-work%20write%3Ajira-work%20offline_access&redirect_uri=${process.env.REDIRECT_URI}&response_type=code&prompt=consent`;
  res.redirect(jiraAuthUrl);
});

// Step 2: Callback with code
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    try {
        const tokenRes = await axios.post('https://auth.atlassian.com/oauth/token', {
            grant_type: 'authorization_code',
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code,
            redirect_uri: process.env.REDIRECT_URI,
        });
        
        accessToken = tokenRes.data.access_token;
        console.log(accessToken) 

    const cloudRes = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    cloudId = cloudRes.data[0].id;

    res.redirect("http://localhost:5173/profile")

  } catch (error) {
    console.error(error);
    res.redirect("http://localhost:5173/error")
    res.status(500).send('❌ Error during OAuth callback');
  }

});

// Step 3: Fetch ticket info
app.get('/jira/issue/:issueKey', async (req, res) => {
  if (!accessToken || !cloudId) {
    return res.status(401).send('Not authorized with Jira.');
  }

  const issueKey = req.params.issueKey;
  try {
    const issueRes = await axios.get(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    res.json(issueRes.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send('Error fetching Jira issue.');
  }
});
// Fetch all issues (paginated, default max 50)
app.get('/jira/issues', async (req, res) => {
    if (!accessToken || !cloudId) {
      return res.status(401).send('Not authorized with Jira.');
    }
  
    try {
      const response = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          params: {
            maxResults: 50, // You can increase or paginate
          },
        }
      );
      
      res.json(response.data.issues);
    } catch (error) {
      console.error(error.response?.data || error.message);
      res.status(500).send('Error fetching Jira issues.');
    }
  });
  // Change the status of a Jira issue
app.post('/jira/transition/:issueKey', async (req, res) => {
    if (!accessToken || !cloudId) {
      return res.status(401).send('Not authorized with Jira.');
    }
  
    const issueKey = req.params.issueKey;
    let trans_id=31;
    if(req.body){
      const {targetStatus}=req.body
      if(targetStatus && targetStatus==1){
        trans_id=21;
      }

    }
    // const { targetStatusName } = req.body; // e.g., "Done", "In Progress"
  
    try {
      // Step 1: Get valid transitions
    //   const transitionsRes = await axios.get(
    //     `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/transitions`,
    //     {
    //       headers: {
    //         Authorization: `Bearer ${accessToken}`,
    //         Accept: 'application/json',
    //       },
    //     }
    //   );
  
    //   const transitions = transitionsRes.data.transitions;
    //   const matched = transitions.find(t => t.name.toLowerCase() === targetStatusName.toLowerCase());
  
    //   if (!matched) {
    //     return res.status(400).send(`❌ Transition "${targetStatusName}" not available.`);
    //   }
  
      // Step 2: Apply transition
      await axios.post(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/transitions`,
        {
          transition: {
            id: trans_id,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
  
      res.send(`✅ Issue transitioned to done .`);
    } catch (error) {
      console.error(error.response?.data || error.message);
      res.status(500).send('❌ Error during status transition.');
    }
  });
  
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
