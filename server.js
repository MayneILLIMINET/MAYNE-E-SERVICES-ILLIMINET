const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

function getId(u){
  const m=u.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})|v=([A-Za-z0-9_-]{11})/);
  return m ? (m[1]||m[2]) : null;
}

app.post('/api/json', async (req,res)=>{
  const {url, isAudioOnly} = req.body;
  const id = getId(url);
  if(!id) return res.status(400).json({status:'error', text:'ID invalide'});

  try{
    // TECHNIQUE SAVEFROM / YT1S - marche même quand YouTube bloque Render
    const apiUrl = 'https://api.vevioz.com/api/button/'+(isAudioOnly?'mp3':'videos')+'/'+id;
    console.log('Essai vevioz', apiUrl);
    
    // On essaie 3 APIs publiques qui font comme SaveFrom
    const tries = [
      async()=>{
        // API 1: vevioz
        const r = await fetch(`https://api.vevioz.com/@api/button/mp3/${id}`, {headers:{'User-Agent':'Mozilla/5.0'}});
        const t = await r.text();
        const m = t.match(/href="([^"]+\.mp3[^"]*)"/) || t.match(/href="([^"]+)"/);
        if(m) return m[1].replace(/&amp;/g,'&');
        throw new Error('vevioz vide');
      },
      async()=>{
        // API 2: y2mate style - 10downloader
        const r = await fetch('https://10downloader.com/download', {
          method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Mozilla/5.0'},
          body: `url=https://www.youtube.com/watch?v=${id}`
        });
        const t = await r.text();
        const m = t.match(/href="([^"]+googlevideo[^"]+)"/) || t.match(/href="([^"]+\.mp4[^"]+)"/);
        if(m) return m[1].replace(/&amp;/g,'&');
        throw new Error('10downloader vide');
      },
      async()=>{
        // API 3: cobalt v10 kwiatekmiki - fallback
        const r = await fetch('https://cobalt-api.kwiatekmiki.com', {
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body: JSON.stringify({url: `https://youtu.be/${id}`, isAudioOnly: isAudioOnly, aFormat:'mp3', vQuality:'720'})
        });
        const j = await r.json();
        if(j.url) return j.url;
        throw new Error(JSON.stringify(j));
      }
    ];

    for(let i=0;i<tries.length;i++){
      try{
        const direct = await tries[i]();
        console.log('OK source', i, direct.slice(0,80));
        return res.json({status:'success', url: direct});
      }catch(e){ console.log('Source', i, 'HS', e.message.slice(0,100)); }
    }
    throw new Error('Toutes HS');

  }catch(e){
    res.status(500).json({status:'error', text: e.message});
  }
});

app.get('/', (req,res)=>res.send('AppDans SaveFrom Engine OK'));
app.listen(process.env.PORT || 3000);