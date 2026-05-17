async function sendPrompt(){

const input =
document
.getElementById("prompt")
.value
.trim();

if(!input)return;


/* 관리자 */

if(input==="/관리자"){

const pw=
prompt("관리자 비밀번호");

if(!pw)return;

const res=
await fetch(
"/admin-login",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
password:pw
})
}
);

const data=
await res.json();

if(data.ok){

location.href=
"/admin.html";

}else{

alert(
"비밀번호 틀림"
);

}

return;

}


/* 일반 생성 */

document
.getElementById(
"result"
)
.innerText=
"생성중...";


const res=
await fetch(
"/deploy",
{
method:"POST",
headers:{
"Content-Type":
"application/json"
},
body:
JSON.stringify({
prompt:input
})
}
);

const data=
await res.json();

document
.getElementById(
"result"
)
.innerText=

data.url
||
data.error
||
"오류발생";

}
