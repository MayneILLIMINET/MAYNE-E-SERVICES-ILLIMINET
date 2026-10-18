const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

function getId(u){
  const m=u.match(/(?:youtu\.be\/|v=|shorts\/)([A-Za-z0-9_-]{11})/);
  return m?m[1]:null;
}

async function tryFetch(url){
  const r=await fetch(url, {headers:{'User-Agent':'Mozilla/5.0'}});
  if(!r.ok) throw new Error('Status '+r.status);
  return r.json();
}

app.post('/api/json', async (req,res)=>{
  const {url, isAudioOnly} = req.body;
  const id = getId(url);
  if(!id) return res.status(400).json({status:'error', text:'ID YouTube non trouvé'});

  const sources = [
    async()=>{ // Piped 1
      const j=await tryFetch(`https://pipedapi.kavin.rocks/streams/${id}`);
      const stream = isAudioOnly ? j.audioStreams?.[0] : j.videoStreams?.find(f=>f.mimeType?.includes('mp4')) || j.videoStreams?.[0];
      if(!stream?.url) throw new Error('Piped kavin vide');
      return stream.url;
    },
    async()=>{ // Piped 2
      const j=await tryFetch(`https://api.piped.privacy.computer/streams/${id}`);
      const stream = isAudioOnly ? j.audioStreams?.[0] : j.videoStreams?.[0];
      if(!stream?.url) throw new Error('Piped privacy vide');
      return stream.url;
    },
    async()=>{ // Invidious
      const j=await tryFetch(`https://inv.nadeko.net/api/v1/videos/${id}`);
      const fmt = isAudioOnly ? j.adaptiveFormats?.find(f=>f.type?.includes('audio')) : j.formatStreams?.[0];
      if(!fmt?.url) throw new Error('Invidious vide');
      return fmt.url;
    },
    async()=>{ // Cobalt instance communautaire
      const r=await fetch('https://cobalt-api.kwiatekmiki.com/api/json',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body: JSON.stringify({url, isAudioOnly, aFormat:'mp3'})
      });
      const j=await r.json();
      if(!j.url) throw new Error(JSON.stringify(j).slice(0,200));
      return j.url;
    }
  ];

  for(let i=0;i<sources.length;i++){
    try{
      console.log('Essai source', i+1);
      const direct = await sources[i]();
      return res.json({status:'success', url: direct});
    }catch(e){
      console.log('Source', i+1, 'echoué', e.message);
    }
  }
  res.status(500).json({status:'error', text:'Toutes les sources ont échoué - YouTube bloque l IP, réessaie dans 2 min avec une autre vidéo'});
});
app.get('/', (req,res)=>res.send('AppDans V9 - Multi Sources OK'));
app.listen(process.env.PORT || 3000);