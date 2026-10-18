const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.post('/api/json', async (req,res)=>{
  try{
    const r = await fetch('https://api.cobalt.tools/api/json',{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify(req.body)
    });
    const j = await r.json();
    res.json(j);
  }catch(e){ res.status(500).json({error:e.message}); }
});
app.get('/', (req,res)=>res.send('AppDans Server OK'));
app.listen(process.env.PORT || 3000);