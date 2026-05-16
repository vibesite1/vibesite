const express=require("express");

const app=express();

app.use(express.json());
app.use(express.static("./"));

app.post("/generate",async(req,res)=>{

const prompt=req.body.prompt;

res.json({
code:
`<!DOCTYPE html>
<html>
<body>
<h1>${prompt}</h1>
</body>
</html>`
});

});

app.listen(
process.env.PORT||3000
);
