const fs = require("fs"); const express = require("express"); const app = express();

app.use(express.json()); app.use(express.static("./"));

/* ========================= 접속 기록 불러오기 ========================= */

let lastSeen = {};

try { lastSeen = JSON.parse( fs.readFileSync("./lastSeen.json","utf8") ); } catch { lastSeen = {}; }

/* ========================= 사이트 생존 신호 ========================= */

app.post("/ping",(req,res)=>{

try{

const site=req.body.site;

if(site){

lastSeen[site]=Date.now();

fs.writeFileSync( "./lastSeen.json", JSON.stringify(lastSeen,null,2) );

console.log("접속:",site);

}

res.json({ok:true});

}catch(e){

res.json({ok:false});

}

});

/* ========================= AI 생성 ========================= */

app.post("/generate", async(req,res)=>{

try{

const prompt=req.body.prompt;

const finalPrompt=` 너는 VibeSites AI다.

완전한 HTML 웹사이트를 생성해라.

규칙:

HTML만 출력

style + script 포함

설명 금지

모바일 대응


요청: ${prompt} `;

const response=await fetch( https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ contents:[{ parts:[{text:finalPrompt}] }] }) } );

const data=await response.json();

let code= data?.candidates?.[0]?.content?.parts?.[0]?.text ||"<h1>생성 실패</h1>";

code+=`

<script>
fetch("https://${process.env.RENDER_EXTERNAL_HOSTNAME}/ping",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
site:location.pathname.replace("/","")
})
}).catch(()=>{})
</script>`;

res.json({code});

}catch(e){

res.json({ code:"AI 오류: "+String(e) });

}

});

/* ========================= GitHub 배포 ========================= */

app.post("/deploy",async(req,res)=>{

try{

const code=req.body.code;

const headers={ Authorization:token ${process.env.GITHUB_TOKEN}, "Content-Type":"application/json" };

const titlePrompt=` 사이트 이름 생성

규칙:

영어

소문자

짧게

하이픈 사용

설명 금지 `;


const titleResponse=await fetch( https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ contents:[{ parts:[{text:titlePrompt+code.substring(0,300)}] }] }) } );

const titleData=await titleResponse.json();

let siteName= titleData?.candidates?.[0]?.content?.parts?.[0]?.text ?.trim() .toLowerCase() .replace(/\s/g,"-") .replace(/[^a-z0-9-]/g,"");

if(!siteName) siteName="site";

let repoName="vibesites-"+siteName;

const repoCheck=await fetch( "https://api.github.com/user/repos", {headers} );

const repoList=await repoCheck.json();

let count=1;

while(repoList.some(r=>r.name===repoName)){ repoName="vibesites-"+siteName+"-"+count; count++; }

await fetch( "https://api.github.com/user/repos", { method:"POST", headers, body:JSON.stringify({ name:repoName, auto_init:true }) } );

await fetch( https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${repoName}/contents/index.html, { method:"PUT", headers, body:JSON.stringify({ message:"auto deploy", content:Buffer.from(code).toString("base64") }) } );

try{ await fetch( https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${repoName}/pages, { method:"POST", headers, body:JSON.stringify({ source:{branch:"main",path:"/"} }) } ) }catch{}

res.json({ url:https://${process.env.GITHUB_USERNAME}.github.io/${repoName} });

}catch(e){

res.json({ url:"배포실패: "+String(e) });

}

});

/* ========================= 3일 자동 삭제 ========================= */

setInterval(async()=>{

const THREE_DAYS= 32460601000;

for(const site in lastSeen){

if(Date.now()-lastSeen[site]>THREE_DAYS){

try{

await fetch( https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${site}, { method:"DELETE", headers:{ Authorization:token ${process.env.GITHUB_TOKEN} } } );

console.log(site+" 삭제완료");

delete lastSeen[site];

fs.writeFileSync( "./lastSeen.json", JSON.stringify(lastSeen,null,2) );

}catch(e){ console.log(e); }

}

}

},60601000);

app.listen(process.env.PORT||3000,()=>{ console.log("서버 실행중"); });
