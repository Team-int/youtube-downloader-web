const express = require('express');
const ytdl = require('ytdl-core');
const bodyParser = require('body-parser');
const fs = require('fs');
const http = require('http');
const PORT = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.get('/', async (req, res) => {
  res.send('asdf')
});
app.get('/process', async (req, res) => {
  let { url } = req.query;
  let videoArr = [];
  let audioArr = [];
  if (!url)
    return res.send(`<script>alert("유효하지 않은 url입니다");location.href='/';</script>`);
  url = youtube_parser(url);
  if (url == false)
    return res.send(`<script>alert("유효하지 않은 url입니다");location.href='/';</script>`);
  ytdl.getInfo(url).then(info => {
    try {
      fs.readFileSync(`${__dirname}/public/audio/${info.videoDetails.title}.wav`);
      audioArr.push({
        title: info.videoDetails.title,
        url: `${"audio"}/${info.videoDetails.title}.wav`,
        quality: `wav default`,
        container: `wav`,
      });
      info.formats.map(createCB('video', videoArr, info));
      info.formats.map(createCB('audio', audioArr, info));
      res.render('result', {
        videoArr,
        audioArr,
        video: {
          thumbnail: `https://i.ytimg.com/vi/${url}/hqdefault.jpg`,
          title: info.videoDetails.title,
          description: info.videoDetails.description,
          date: info.videoDetails.publishDate,
          like: info.videoDetails.likes,
          dislike: info.videoDetails.dislikes,
          isNsfw: info.videoDetails.age_restricted,
          iframe: info.videoDetails.embed.iframeUrl,
          views: `${info.videoDetails.viewCount}`
        },
        author: {
          name: info.videoDetails.author.name
        }
      });
    } catch (e) {
      ytdl(url, {filter: 'audioonly'})
      .pipe(fs.createWriteStream(`${__dirname}/public/audio/${info.videoDetails.title}.wav`))
      .on("finish", () => {
        audioArr.push({
          title: info.videoDetails.title,
          url: `${"audio"}/${info.videoDetails.title}.wav`,
          quality: `wav default`,
          container: `wav`,
        });
        info.formats.map(createCB('video', videoArr, info));
        info.formats.map(createCB('audio', audioArr, info));
        res.render('result', {
          videoArr,
          audioArr,
          video: {
            thumbnail: `https://i.ytimg.com/vi/${url}/hqdefault.jpg`,
            title: info.videoDetails.title,
            description: info.videoDetails.description.slice(0, 250),
            date: info.videoDetails.publishDate,
            like: info.videoDetails.likes,
            dislike: info.videoDetails.dislikes,
            isNsfw: info.videoDetails.age_restricted,
            iframe: info.videoDetails.embed.iframeUrl,
            views: `${info.videoDetails.viewCount}`
          },
          author: {
            name: info.videoDetails.author.name
          }
        });
      })
    }
  });
});
http.createServer(app).listen(PORT, () => {
  console.log(`Listening on Port ${PORT}, HTTP 1.1`);
});
function youtube_parser(url){
  var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  var match = url.match(regExp);
  return (match&&match[7].length==11)? match[7] : false;
}
function createCB(type, arr, info) {
  if (type == 'video') {
    const cb = format => {
      if (arr.length > 5)  return;
      if (format.hasVideo && format.hasAudio) {
        arr.push({
          title: info.videoDetails.title,
          url: format.url,
          fps: format.fps,
          quality: format.qualityLabel,
          container: format.container,
          asdf: format.bitrate
        })
      }
    }
    return cb;
  } else {
    const cb = format => {
      if (arr.length > 5)  return;
      if (!format.hasVideo && format.hasAudio) {
        arr.push({
          title: info.videoDetails.title,
          url: format.url,
          quality: `${format.audioBitrate} Kbps`,
          container: `${format.container == 'mp4' ?  `m4a` : `${format.container}`}`,
        });
      }
    }
    return cb;
  }
}
