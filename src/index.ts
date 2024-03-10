import express from "express";
import bodyParser from "body-parser";
import { exec } from "child_process";
import ProjectInterface from "./types/payload.interface";
import Config from "./config";


const PORT = process.env.PORT || 3000;


const config = new Config();

const app = express();
app.use(bodyParser.json());

app.post("/webhook/test", async (req, res) => {
    try {
        const parsedBody = parseBody(req.body);
        if("error" in parsedBody) return res.status(parsedBody.status).end();
        const project = config.getConfigByFullNameAndTag(parsedBody.full_name, parsedBody.tag);
        if(!project) return res.status(404).end();
        res.status(200).end(JSON.stringify(project));
    }
    catch(err: any) {
        console.error(err);
        return res.status(500).end(JSON.stringify(err));;
    }
});

app.post("/webhook", async (req, res) => {
  try {

    const parsedBody = parseBody(req.body);
    if("error" in parsedBody) return res.status(parsedBody.status).end();

    const project = config.getConfigByFullNameAndTag(parsedBody.full_name, parsedBody.tag);
    if(!project) return res.status(404).end();
    await executeCommandAtPathCallback("docker compose pull", project.basePath);
    await executeCommandAtPathCallback("docker compose up -d", project.basePath);
    return res.status(200).end("OK");
  }
    catch(err: any) {
        console.error(err);
        return res.status(500).end(JSON.stringify(err));
    }
});


app.listen(PORT, () => console.log(`Listening on port ${PORT}`));


function parseBody (body: any) {
    if(!body) return {error: true, status: 400};
    if(!body.events || !Array.isArray(body.events)) return {error: true, status: 400};
    const parsedBody = (body as ProjectInterface).events[0];
    if(!parsedBody) return {error: true, status: 400};
    if(!parsedBody.tag || !parsedBody.full_name || !parsedBody.project || !parsedBody.repo_name) return {error: true, status: 400};

    return parsedBody;
}

function executeCommandAtPathCallback(command: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => { 
        exec(command, {cwd: path}, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
        }).on("exit", code => {
            if (code!== 0) {
                reject(new Error(`Process exited with code ${code}`));
            }
            resolve();
        })
    });
}