const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("./"));

/* =========================
   관리자 로그인
========================= */

app.post("/admin-login",(req,res)=>{

const password=req.body.password;

if(password===process.env.ADMIN_PASSWORD){

return res.json({
ok:true
});

}

res.json({
ok:false
});

});


/* =========================
   사이트 생성 + 배포
========================= */

app.post("/deploy", async (req,res)=>{

try{

const codePrompt=req.body.prompt;


/* =========================
   HTML 생성
========================= */

const aiRes=await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,

{
method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:JSON.stringify({

contents:[{

parts:[{

text:`

너는 웹사이트 생성 AI다.

완전한 HTML 하나만 출력해라.

규칙:

- HTML CSS JS 포함
- 설명 금지
- 모바일 대응

요청:

${codePrompt}

`

}]

}]

})

}

);


const aiData=
await aiRes.json();


const html=

aiData?.candidates?.[0]
?.content?.parts?.[0]
?.text

||

"<h1>생성 실패</h1>";



/* =========================
   이름 생성
========================= */

const nameRes=await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,

{
method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:JSON.stringify({

contents:[{

parts:[{

text:`

사이트 이름 생성

규칙:

영어
짧게
하이픈 사용

주제:

${codePrompt}

`

}]

}]

})

}

);


const nameData=
await nameRes.json();


let siteName=

nameData?.candidates?.[0]
?.content?.parts?.[0]
?.text

?.trim()

?.toLowerCase()

?.replace(/\s/g,"-")

?.replace(
/[^a-z0-9-]/g,
""
);


if(!siteName){

siteName="site";

}


/* =========================
   repo 생성
========================= */

const repoName=

"vibesites-"

+siteName+

"-"

+Date.now();


const headers={

Authorization:

`token ${process.env.GITHUB_TOKEN}`,

"Content-Type":

"application/json"

};


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


/* index 업로드 */

await fetch(

`https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${repoName}/contents/index.html`,

{

method:"PUT",

headers,

body:JSON.stringify({

message:"auto deploy",

content:

Buffer.from(html)
.toString("base64")

})

}

);


/* Pages */

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

}catch(e){}


/* 결과 */

res.json({

url:

`https://${process.env.GITHUB_USERNAME}.github.io/${repoName}`

});


}catch(e){

res.json({

error:e.message

});

}

});


app.listen(
process.env.PORT||3000
);
