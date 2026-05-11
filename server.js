require("dotenv").config();

const express = require("express");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const ADMIN_KEY = "nextageadmin123";
const app = express();
const PORT = 3000;
const DB_PATH = "./database.json";

app.use(express.urlencoded({ extended:true }));
app.use(express.json());
app.use(cookieParser());

app.use(fileUpload({
  limits:{ fileSize:300 * 1024 * 1024 }
}));

app.use(session({
  secret:"purple_secret",
  resave:false,
  saveUninitialized:false
}));

app.use("/uploads", express.static(path.join(__dirname,"uploads")));
app.use("/assets", express.static(path.join(__dirname,"assets")));

/*
function ensureFolder(folder){
if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{ recursive:true });
}
}

ensureFolder(path.join(__dirname,"uploads"));
ensureFolder(path.join(__dirname,"uploads","avatars"));
ensureFolder(path.join(__dirname,"uploads","banners"));
ensureFolder(path.join(__dirname,"uploads","musics"));
ensureFolder(path.join(__dirname,"uploads","videos"));
*/

function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({ users:[] },null,2));
  }

  return JSON.parse(fs.readFileSync(DB_PATH,"utf8"));
}

function saveDB(data){
  fs.writeFileSync(DB_PATH, JSON.stringify(data,null,2));
}

function getUser(req){
  const username = req.cookies.purple_user;

  if(!username) return null;

  const db = loadDB();

  return db.users.find(u=>u.username === username);
}

function createDefaultUser(username,password="",email=""){
  return {
    username,
    password,
    email,

    uid:0,
    views:0,
    viewedBy:[],

    plan:"FREE",
    theme:"dark",

    premiumBadge:"off",
    premiumGlow:"off",
    premiumNameGlow:"off",
    premiumRgbName:"off",
    premiumRgbAvatar:"off",

    bio:"",
    location:"Brasil",

    accentColor:"#a855f7",
    accentColor2:"#ff00ff",
    iconColor:"#ffffff",

    backgroundMode:"none",

    opacity:"20",
    blur:"0",
    brightness:"100",
    cardOpacity:"45",

    glow:"off",
    gradientName:"off",
    iconGlow:"off",
    hideViews:"off",
    showCard:"on",

    avatar:"",
    banner:"",
    music:"",
    video:"",

    discord:"",
    instagram:"",
    tiktok:"",
    youtube:"",
    kick:"",
    twitch:"",
    twitter:"",
    spotify:"",
    github:"",
    steam:""
  };
}

/* HOME */

app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"home.html"));
});

/* LOGIN */

app.get("/login",(req,res)=>{
  res.sendFile(path.join(__dirname,"login.html"));
});

app.post("/login",(req,res)=>{
  const db = loadDB();

  const login = String(req.body.username || req.body.email || "")
    .trim()
    .toLowerCase();

  const password = String(req.body.password || "");

  const user = db.users.find(u=>
    (
      String(u.username || "").toLowerCase() === login ||
      String(u.email || "").toLowerCase() === login
    ) &&
    u.password === password
  );

  if(!user){
    return res.send(`
      <body style="background:#08000f;color:white;font-family:Arial;padding:40px">
        <h1>Conta inválida.</h1>
        <a style="color:#a855f7" href="/login">Voltar</a>
      </body>
    `);
  }

  res.cookie("purple_user", user.username);
  res.redirect("/dashboard");
});

/* REGISTER */

app.get("/register",(req,res)=>{
  res.sendFile(path.join(__dirname,"register.html"));
});

app.post("/register",(req,res)=>{
  const db = loadDB();

  const username = String(req.body.username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g,"")
    .slice(0,20);

  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();

  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if(!username || !password){
    return res.send(`
      <body style="background:#08000f;color:white;font-family:Arial;padding:40px">
        <h1>Preencha tudo.</h1>
        <a style="color:#a855f7" href="/register">Voltar</a>
      </body>
    `);
  }

  if(confirmPassword && password !== confirmPassword){
    return res.send(`
      <body style="background:#08000f;color:white;font-family:Arial;padding:40px">
        <h1>As senhas não são iguais.</h1>
        <a style="color:#a855f7" href="/register">Voltar</a>
      </body>
    `);
  }

  const exists = db.users.find(u=>u.username === username);

  if(exists){
    return res.send(`
      <body style="background:#08000f;color:white;font-family:Arial;padding:40px">
        <h1>Usuário já existe.</h1>
        <a style="color:#a855f7" href="/register">Voltar</a>
      </body>
    `);
  }

  const newUser = createDefaultUser(username,password,email);
  newUser.uid = db.users.length + 1;

  db.users.push(newUser);
  saveDB(db);

  res.cookie("purple_user", newUser.username);
  res.redirect("/dashboard");
});

/* DASHBOARD */

app.get("/dashboard",(req,res)=>{
  const user = getUser(req);

  if(!user){
    return res.redirect("/login");
  }

  res.sendFile(path.join(__dirname,"dashboard.html"));
});

/* API */

app.get("/api/me",(req,res)=>{
  const user = getUser(req);

  if(!user){
    return res.json({ logged:false });
  }

  res.json({
    logged:true,
    user
  });
});

/* SAVE PROFILE */

app.post("/save-profile",async(req,res)=>{
  const user = getUser(req);

  if(!user){
    return res.json({ success:false });
  }

  const db = loadDB();

  const index = db.users.findIndex(u=>u.username === user.username);

  if(index === -1){
    return res.json({ success:false });
  }

  const target = db.users[index];

  const newUsername = String(req.body.username || target.username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g,"")
    .slice(0,20);

  if(newUsername){
    const exists = db.users.find((u,i)=>
      u.username === newUsername && i !== index
    );

    if(exists){
      return res.json({
        success:false,
        error:"Esse username já está em uso."
      });
    }

    target.username = newUsername;
    res.cookie("purple_user", newUsername);
  }

  if(req.body.email){
    target.email = String(req.body.email || "").trim().toLowerCase();
  }

  if(
    req.body.newPassword &&
    req.body.confirmNewPassword &&
    req.body.newPassword === req.body.confirmNewPassword
  ){
    target.password = String(req.body.newPassword);
  }

  target.bio = req.body.bio || "";
  target.location = req.body.location || "";

  target.accentColor = req.body.accentColor || "#a855f7";
  target.accentColor2 = req.body.accentColor2 || "#ff00ff";
  target.iconColor = req.body.iconColor || "#ffffff";

  target.backgroundMode = req.body.backgroundMode || "none";

  target.opacity = req.body.opacity || "20";
  target.blur = req.body.blur || "0";
  target.brightness = req.body.brightness || "100";
  target.cardOpacity = req.body.cardOpacity || "45";

  target.glow = req.body.glow || "off";
  target.gradientName = req.body.gradientName || "off";
  target.iconGlow = req.body.iconGlow || "off";
  target.hideViews = req.body.hideViews || "off";
  target.showCard = req.body.showCard || "on";

  target.premiumBadge = req.body.premiumBadge || "off";
  target.premiumGlow = req.body.premiumGlow || "off";
  target.premiumNameGlow = req.body.premiumNameGlow || "off";
  target.premiumRgbName = req.body.premiumRgbName || "off";
  target.premiumRgbAvatar = req.body.premiumRgbAvatar || "off";

  target.theme = req.body.theme || target.theme || "dark";

  target.discord = req.body.discord || "";
  target.instagram = req.body.instagram || "";
  target.tiktok = req.body.tiktok || "";
  target.youtube = req.body.youtube || "";
  target.kick = req.body.kick || "";
  target.twitch = req.body.twitch || "";
  target.twitter = req.body.twitter || "";
  target.spotify = req.body.spotify || "";
  target.github = req.body.github || "";
  target.steam = req.body.steam || "";

  if(req.files?.avatar){
    const avatar = req.files.avatar;
    const fileName = Date.now() + "-" + avatar.name;
    const uploadPath = path.join(__dirname,"uploads","avatars",fileName);

    await avatar.mv(uploadPath);

    target.avatar = "/uploads/avatars/" + fileName;
  }

  if(req.files?.banner){
    const banner = req.files.banner;
    const fileName = Date.now() + "-" + banner.name;
    const uploadPath = path.join(__dirname,"uploads","banners",fileName);

    await banner.mv(uploadPath);

    target.banner = "/uploads/banners/" + fileName;
  }

  if(req.files?.music){
    const music = req.files.music;
    const fileName = Date.now() + "-" + music.name;
    const uploadPath = path.join(__dirname,"uploads","musics",fileName);

    await music.mv(uploadPath);

    target.music = "/uploads/musics/" + fileName;
  }

  if(req.files?.video){
    const video = req.files.video;
    const fileName = Date.now() + "-" + video.name;
    const uploadPath = path.join(__dirname,"uploads","videos",fileName);

    await video.mv(uploadPath);

    target.video = "/uploads/videos/" + fileName;
  }

  saveDB(db);

  res.json({
    success:true,
    user:target
  });
});

/* SAVE PREMIUM */

app.post("/save-premium",(req,res)=>{
  const user = getUser(req);

  if(!user){
    return res.json({ success:false });
  }

  const db = loadDB();

  const target = db.users.find(u=>u.username === user.username);

  if(!target){
    return res.json({ success:false });
  }

  target.premiumBadge = req.body.premiumBadge || "off";
  target.premiumGlow = req.body.premiumGlow || "off";
  target.premiumNameGlow = req.body.premiumNameGlow || "off";
  target.iconGlow = req.body.iconGlow || "off";
  target.hideViews = req.body.hideViews || "off";
  target.premiumRgbName = req.body.premiumRgbName || "off";
  target.premiumRgbAvatar = req.body.premiumRgbAvatar || "off";

  saveDB(db);

  res.json({
    success:true,
    user:target
  });
});

/* PREMIUM */

/* PREMIUM */

app.get("/premium",(req,res)=>{

const user = getUser(req);

if(!user){
return res.redirect("/login");
}

res.send(`
<body style="
background:#07000d;
color:white;
font-family:Arial;
display:flex;
align-items:center;
justify-content:center;
height:100vh;
margin:0;
">

<div style="
background:#12051d;
padding:40px;
border-radius:24px;
width:420px;
border:1px solid rgba(168,85,247,.2);
text-align:center;
">

<h1 style="
font-size:42px;
margin-bottom:10px;
">
Premium
</h1>

<p style="
opacity:.7;
line-height:1.6;
margin-bottom:25px;
">
Desbloqueie RGB, glow, badge premium,
efeitos exclusivos e muito mais.
</p>

<div style="
font-size:38px;
font-weight:900;
color:#a855f7;
margin-bottom:25px;
">
R$ 19,90
</div>

<form action="/create-payment" method="POST">
  <button style="
  width:100%;
  height:56px;
  border:none;
  border-radius:18px;
  background:linear-gradient(90deg,#a855f7,#7c3aed);
  color:white;
  font-weight:900;
  font-size:16px;
  cursor:pointer;
  ">
  Comprar Premium
  </button>
</form>

</div>

</body>
`);
});

app.post("/create-payment", async(req,res)=>{

try{

const user = getUser(req);

if(!user){
return res.json({
success:false,
error:"Faça login."
});
}

const response = await fetch(
"https://api.mercadopago.com/checkout/preferences",
{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":"Bearer " + process.env.MP_ACCESS_TOKEN
},
body:JSON.stringify({
items:[
{
title:"Premium Purple",
quantity:1,
currency_id:"BRL",
unit_price:Number(process.env.PREMIUM_PRICE || 19.90)
}
],
external_reference:user.username
})
}
);

const data = await response.json();

console.log(data);

return res.redirect(data.init_point);

}catch(err){

console.log("ERRO MP:");
console.log(err);

res.json({
success:false,
error:String(err)
});

}

});

/* PAYMENT SUCCESS */

app.get("/payment-success",(req,res)=>{

const user = getUser(req);

if(!user){
return res.redirect("/login");
}

const db = loadDB();

const target = db.users.find(
u=>u.username === user.username
);

if(target){

target.plan = "PREMIUM";

target.premiumBadge = "on";
target.premiumGlow = "on";
target.premiumNameGlow = "on";
target.iconGlow = "on";
target.premiumRgbName = "on";
target.premiumRgbAvatar = "on";

saveDB(db);

}

res.redirect("/dashboard");

});

/* LOGOUT */

app.get("/logout",(req,res)=>{
  res.clearCookie("purple_user");
  res.redirect("/");
});
/* DISCORD LOGIN */

app.get("/auth/discord",(req,res)=>{

  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if(!clientId || !redirectUri){
    return res.send("Discord não configurado no .env");
  }

  const url =
    "https://discord.com/oauth2/authorize" +
    "?client_id=" + encodeURIComponent(clientId) +
    "&redirect_uri=" + encodeURIComponent(redirectUri) +
    "&response_type=code" +
    "&scope=identify%20email";

  res.redirect(url);

});

app.get("/auth/discord/callback",async(req,res)=>{

  try{

    const code = req.query.code;

    if(!code){
      return res.send("Código Discord não encontrado.");
    }

    const tokenReq = await fetch("https://discord.com/api/oauth2/token",{
      method:"POST",
      headers:{
        "Content-Type":"application/x-www-form-urlencoded"
      },
      body:new URLSearchParams({
        client_id:process.env.DISCORD_CLIENT_ID,
        client_secret:process.env.DISCORD_CLIENT_SECRET,
        grant_type:"authorization_code",
        code,
        redirect_uri:process.env.DISCORD_REDIRECT_URI
      })
    });

    const tokenData = await tokenReq.json();

    if(!tokenData.access_token){
      return res.send("Erro ao pegar token do Discord.");
    }

    const userReq = await fetch("https://discord.com/api/users/@me",{
      headers:{
        Authorization:`Bearer ${tokenData.access_token}`
      }
    });

    const discordUser = await userReq.json();

    const db = loadDB();

    let username =
      String(discordUser.username || "user")
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g,"")
      .slice(0,20);

    let user = db.users.find(u=>u.discordId === discordUser.id);

    if(!user){

      let finalName = username;
      let count = 1;

      while(db.users.find(u=>u.username === finalName)){
        finalName = username + count;
        count++;
      }

      user = createDefaultUser(finalName,"",discordUser.email || "");

      user.uid = db.users.length + 1;
      user.discordId = discordUser.id;
      user.discordUsername = discordUser.username;

      if(discordUser.avatar){
        user.avatar =
          `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;
      }

      db.users.push(user);

    }

    saveDB(db);

    res.cookie("purple_user", user.username);

    res.redirect("/dashboard");

  }catch(err){

    console.log(err);
    res.send("Erro no login Discord.");

  }

});
/* PROFILE */

app.get("/admin",(req,res)=>{
  if(String(req.query.key) !== String(ADMIN_KEY)){
    return res.send("Sem acesso.");
  }

  res.send(`
  <body style="background:#07000d;color:white;font-family:Arial;padding:40px">
    <h1>Painel Admin Premium</h1>

    <form method="POST" action="/admin/premium?key=${ADMIN_KEY}">
      <input name="uid" placeholder="UID da pessoa" style="padding:15px;border-radius:10px;border:0">
      
      <select name="action" style="padding:15px;border-radius:10px">
        <option value="add">Dar Premium</option>
        <option value="remove">Remover Premium</option>
      </select>

      <button style="
      padding:15px 25px;
      border:0;
      border-radius:10px;
      background:#a855f7;
      color:white;
      font-weight:900;
      cursor:pointer;
      ">
        Aplicar
      </button>
    </form>
  </body>
  `);
});

app.post("/admin/premium",(req,res)=>{
  if(String(req.query.key) !== String(ADMIN_KEY)){
    return res.send("Sem acesso.");
  }

  const uid = Number(req.body.uid);
  const action = req.body.action;

  const db = loadDB();

  const user = db.users.find(
    u => Number(u.uid) === uid
  );

  if(!user){
    return res.send("Usuário não encontrado.");
  }

  if(action === "add"){

    user.plan = "PREMIUM";

    user.premiumBadge = "on";
    user.premiumGlow = "on";
    user.premiumNameGlow = "on";
    user.iconGlow = "on";
    user.premiumRgbName = "on";
    user.premiumRgbAvatar = "on";

  }

  if(action === "remove"){

    user.plan = "FREE";

    user.premiumBadge = "off";
    user.premiumGlow = "off";
    user.premiumNameGlow = "off";
    user.iconGlow = "off";
    user.premiumRgbName = "off";
    user.premiumRgbAvatar = "off";
    user.hideViews = "off";

  }

  saveDB(db);

  res.send(`
  <body style="background:#07000d;color:white;font-family:Arial;padding:40px">
    <h1>Feito!</h1>

    <p>
      ${user.username} agora está como ${user.plan}
    </p>

    <a href="/admin?key=${ADMIN_KEY}" style="color:#a855f7">
      Voltar
    </a>
  </body>
  `);
});

app.get("/:username",(req,res,next)=>{
  const username = req.params.username;

  if(username.includes(".")){
    return next();
  }

  const db = loadDB();

  const user = db.users.find(
    u=>String(u.username || "").toLowerCase() === String(username || "").toLowerCase()
  );

  if(!user){
    return res.send("Perfil não encontrado.");
  }

  let viewedBy = user.viewedBy || [];
  const viewer = req.ip;

  if(!viewedBy.includes(viewer)){
    viewedBy.push(viewer);
    user.viewedBy = viewedBy;
    user.views = viewedBy.length;
    saveDB(db);
  }

  fs.readFile(path.join(__dirname,"perfil.html"),"utf8",(err,data)=>{
    if(err){
      return res.send("Erro.");
    }

    let html = data;

    const glowClass =
      user.glow === "on"
      ? "glow-on"
      : "";

    const premiumClass =
      user.plan === "PREMIUM" &&
      user.premiumRgbAvatar === "on"
      ? "premium-user"
      : "";

    const premiumNameClass =
      user.plan === "PREMIUM" &&
      user.premiumRgbName === "on"
      ? "premium-name"
      : "";

    const premiumBlock =
      user.premiumBadge === "on"
      ? `
      <div class="badge">
        <i class="fa-solid fa-gem"></i>
        PREMIUM
      </div>
      `
      : "";

    const bioBlock =
      user.bio
      ? `<div class="bio">${user.bio}</div>`
      : "";

    const locationBlock =
      user.location
      ? `<div class="location">📍 ${user.location}</div>`
      : "";

    const viewsBlock =
      user.hideViews === "on"
      ? ""
      : `<div class="views">👁 ${user.views || 0} visualizações</div>`;

    const iconGlowClass =
      user.iconGlow === "on"
      ? "icon-glow"
      : "";

    const socialsBlock = `
    <div class="socials ${iconGlowClass}">
      ${user.discord ? `<a href="${user.discord}" target="_blank"><i class="fa-brands fa-discord"></i></a>` : ""}
      ${user.instagram ? `<a href="${user.instagram}" target="_blank"><i class="fa-brands fa-instagram"></i></a>` : ""}
      ${user.tiktok ? `<a href="${user.tiktok}" target="_blank"><i class="fa-brands fa-tiktok"></i></a>` : ""}
      ${user.youtube ? `<a href="${user.youtube}" target="_blank"><i class="fa-brands fa-youtube"></i></a>` : ""}
      ${user.kick ? `<a href="${user.kick}" target="_blank"><i class="fa-brands fa-kickstarter-k"></i></a>` : ""}
      ${user.twitch ? `<a href="${user.twitch}" target="_blank"><i class="fa-brands fa-twitch"></i></a>` : ""}
      ${user.twitter ? `<a href="${user.twitter}" target="_blank"><i class="fa-brands fa-x-twitter"></i></a>` : ""}
      ${user.spotify ? `<a href="${user.spotify}" target="_blank"><i class="fa-brands fa-spotify"></i></a>` : ""}
      ${user.github ? `<a href="${user.github}" target="_blank"><i class="fa-brands fa-github"></i></a>` : ""}
      ${user.steam ? `<a href="${user.steam}" target="_blank"><i class="fa-brands fa-steam"></i></a>` : ""}
    </div>
    `;

    const videoBlock =
      user.backgroundMode === "video" && user.video
      ? `
      <video class="bg-video" autoplay muted loop playsinline>
        <source src="${user.video}" type="video/mp4">
      </video>
      `
      : "";

    const musicBlock =
      user.music
      ? `
      <audio id="bgMusic" loop>
        <source src="${user.music}" type="audio/mpeg">
      </audio>

      <button class="music-btn" id="musicBtn">
        <i class="fa-solid fa-volume-high"></i>
      </button>

      <div class="enter-screen" id="enterScreen">
        click to enter...
      </div>
      `
      : "";

    html = html
      .replace(/{{username}}/g,user.username || "")
      .replace(/{{avatar}}/g,user.avatar || "/assets/logo.png")
      .replace(/{{banner}}/g,user.banner || "")
      .replace(/{{accentColor}}/g,user.accentColor || "#a855f7")
      .replace(/{{accentColor2}}/g,user.accentColor2 || "#ff00ff")
      .replace(/{{gradientName}}/g,user.gradientName || "off")
      .replace(/{{iconColor}}/g,user.iconColor || "#ffffff")
      .replace(/{{backgroundMode}}/g,user.backgroundMode || "none")
      .replace(/{{brightness}}/g,user.brightness || "100")
      .replace(/{{blur}}/g,user.blur || "0")
      .replace(/{{opacity}}/g,user.opacity || "20")
      .replace(/{{cardOpacity}}/g,user.cardOpacity || "45")
      .replace(/{{showCard}}/g,user.showCard || "on")
      .replace(/{{glowClass}}/g,glowClass)
      .replace(/{{premiumClass}}/g,premiumClass)
      .replace(/{{premiumNameClass}}/g,premiumNameClass)
      .replace(/{{premiumBlock}}/g,premiumBlock)
      .replace(/{{bioBlock}}/g,bioBlock)
      .replace(/{{locationBlock}}/g,locationBlock)
      .replace(/{{socialsBlock}}/g,socialsBlock)
      .replace(/{{viewsBlock}}/g,viewsBlock)
      .replace(/{{videoBlock}}/g,videoBlock)
      .replace(/{{musicBlock}}/g,musicBlock);

    res.send(html);
  });
});

/* START */

module.exports = app;