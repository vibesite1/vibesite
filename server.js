const fs = require("fs");
const express = require("express");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static("./"));

/* =========================
   접속 기록
========================= */

let lastSeen = {};

try{
lastSeen=JSON.parse(
fs.readFileSync(
"./lastSeen.json",
"utf8"
)
);
}catch{
lastSeen={};
}


/* =========================
   ping
========================= */

app.post("/ping",(req,res)=>{

try{

const site=req.body.site;

if(site){

lastSeen[site]=Date.now();

fs.writeFileSync(
"./lastSeen.json",
JSON.stringify(
lastSeen,
null,
2
)
);

}

res.json({
ok:true
});

}catch{

res.json({
ok:false
});

}

});


/* =========================
   생성
========================= */

app.post("/generate",async(req,res)=>{

try{

const prompt=req.body.prompt;

const finalPrompt=`

너는 VibeSites AI

규칙:

HTML만 출력
설명 금지
style 포함
script 포함
모바일 대응

요청:

${prompt}

`;

const response=
await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,

{
method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

contents:[{
parts:[{
text:finalPrompt
}]
}]

})

}

);

const data=
await response.json();

let code=

data?.candidates?.[0]
?.content?.parts?.[0]
?.text

||

"<h1>생성 실패</h1>";



code+=`

<script>

(async()=>{

try{

await fetch(
"https://${process.env.RENDER_EXTERNAL_HOSTNAME}/ping",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

site:
location.pathname
.replace("/","")

})

}

);

}catch{}

})();

</script>

`;

res.json({
code
});

}catch(e){

res.json({
code:
"AI 오류: "
+
String(e)
});

}

});


/* =========================
   배포
========================= */

app.post("/deploy",async(req,res)=>{

try{

const code=req.body.code;

const headers={

Authorization:
`token ${process.env.GITHUB_TOKEN}`,

"Content-Type":
"application/json"

};



const titlePrompt=`

사이트 이름 하나 생성

규칙:

- 영어
- 소문자
- 단어1~2개
- 하이픈 최대1개
- 설명금지
- 후보 여러개 금지
- 이름만 출력

`;



const titleResponse=
await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,

{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

contents:[{

parts:[{

text:
titlePrompt
+
code.substring(
0,
200
)

}]

}]

})

}

);



const titleData=
await titleResponse.json();



let siteName=

titleData?.candidates?.[0]
?.content?.parts?.[0]
?.text

?.split("\n")[0]
?.split(",")[0]

?.trim()

.toLowerCase()

.replace(/\s+/g,"-")
.replace(/-+/g,"-")
.replace(/[^a-z0-9-]/g,"")

.substring(0,30);



if(
!siteName
||
siteName.length<3
){

siteName="site";

}



/* 중복 */

let repoName=
"vibesites-"
+
siteName;



const repoCheck=
await fetch(

"https://api.github.com/user/repos",

{
headers
}

);

const repoList=
await repoCheck.json();


let count=1;

while(

repoList.some(
r=>
r.name===repoName
)

){

repoName=
"vibesites-"
+
siteName
+
"-"
+
count;

count++;

}



/* repo 생성 */

await fetch(

"https://api.github.com/user/repos",

{

method:"POST",

headers,

body:JSON.stringify({

name:repoName,

auto_init:true

})

}

);



/* html */

await fetch(

`https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${repoName}/contents/index.html`,

{

method:"PUT",

headers,

body:JSON.stringify({

message:
"auto deploy",

content:
Buffer
.from(code)
.toString(
"base64"
)

})

}

);



/* pages */

try{

await fetch(

`https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${repoName}/pages`,

{

method:"POST",

headers,

body:JSON.stringify({

source:{

branch:"main",
path:"/"

}

})

}

);

}catch{}



res.json({

url:
`https://${process.env.GITHUB_USERNAME}.github.io/${repoName}`

});

}catch(e){

res.json({

url:
"배포실패:"
+
String(e)

});

}

});


/* =========================
   3일 삭제
========================= */

setInterval(async()=>{

const THREE_DAYS=
3*24*60*60*1000;

for(
const site
in
lastSeen
){

if(

Date.now()
-
lastSeen[site]

>
THREE_DAYS

){

try{

await fetch(

`https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${site}`,

{

method:
"DELETE",

headers:{

Authorization:
`token ${process.env.GITHUB_TOKEN}`

}

}

);

delete lastSeen[site];

fs.writeFileSync(
"./lastSeen.json",
JSON.stringify(
lastSeen,
null,
2
)
);

}catch{}

}

}

},
60*60*1000);



app.listen(
process.env.PORT||3000,
()=>{

console.log(
"서버 실행중"
);

});
