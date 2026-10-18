const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/json', async (req,res)=>{
  const {url, isAudioOnly} = req.body;
  try{
    console.log('Demande:', url);
    const info = await ytdl.getInfo(url);
    let format;
    if(isAudioOnly){
      format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    }else{
      // cherche mp4 avec son
      format = ytdl.chooseFormat(info.formats, { filter: f => f.hasVideo && f.hasAudio && f.container === 'mp4' });
      if(!format) format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
    }
    if(!format || !format.url) throw new Error('Aucun format trouvé');
    res.json({ status:'success', url: format.url, title: info.videoDetails.title });
  }catch(e){
    console.error(e);
    res.status(500).json({status:'error', text: e.message});
  }
});

app.get('/', (req,res)=>res.send('AppDans V8 - Nouveau moteur YTDL OK'));
app.listen(process.env.PORT || 3000);