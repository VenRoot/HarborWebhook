import express from "express";
import bodyParser from "body-parser";
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import ProjectInterface from "./types/payload.interface";
import Config from "./config";
import type { ConfigType } from "./types/config.interface";
import filesystem from "./utils/fs";
import path from "node:path";
import PortDictionary from "./utils/portDictionary";

const PORT = process.env.PORT || 3000;


const config = new Config();

const app = express();
app.use(bodyParser.json());

app.post("/webhook/test", async (req, res) => {
    try {
        const parsedBody = parseBody(req.body);
        if("error" in parsedBody) return res.status(parsedBody.status).end();
        const project = config.getConfigByFullNameAndTag(parsedBody.repository.repo_full_name, parsedBody.resources[0].tag);
        if(!project) return res.status(404).end();
        try {
            if(!(await fs.stat(project.basePath)).isDirectory()) throw new Error();
        } catch(e) { 
            return res.status(500).end("Path does not exist or is mounted the wrong way. Wrong configuration?"); 
        }
        res.status(200).end(JSON.stringify(project));
    }
    catch(err: any) {
        console.error(err);
        return res.status(500).end(JSON.stringify(err));
    }
});

app.post("/webhook", async (req, res) => {
  try {

    const parsedBody = parseBody(req.body);
    if("error" in parsedBody) return res.status(parsedBody.status).end();

    const project = config.getConfigByFullNameAndTag(parsedBody.repository.repo_full_name, parsedBody.resources[0].tag);
    if(!project) return res.status(404).end();

    if(project.fullName === "ventry/ventry" && project.tag.includes("pr-")) {
        await handleVentryPr(project);
        return res.status(200).end("OK");
    }

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
    if(!body.event_data.resources || !Array.isArray(body.event_data.resources)) return {error: true, status: 400};
    const parsedBody = (body as ProjectInterface).event_data;
    if(!parsedBody) return {error: true, status: 400};
    if(!parsedBody.resources[0].tag || !parsedBody.repository.repo_full_name) return {error: true, status: 400};

    return parsedBody;
}

function executeCommandAtPathCallback(command: string, path: string = process.cwd()): Promise<void> {
    return new Promise((resolve, reject) => { 
        exec(command, {cwd: path}, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
        }).on("exit", code => {
            if (code!== 0) {
                console.error(`Command ${command} failed!`);
                reject(new Error(`Process exited with code ${code}`));
            }
            resolve();
        })
    });
}


async function handleVentryPr(project: ConfigType) {
    if(!project) return;

    const prNumber = `pr-${project.tag.split("pr-")[1]}`;
    const prPath = `${project.basePath}/prs/${prNumber}`;

    if(!await filesystem.pathExists(prPath))
    {
        await fs.mkdir(prPath, { recursive: true });
        const tmpPath = await fs.mkdtemp("tmp-ventry-pr");

        // Clone the repository and extract .docker/docker-compose.pr.yml to the prPath
        const cloneCommand = `git clone --depth 1 ${project.git.fullUrl} ${tmpPath}`;
        await executeCommandAtPathCallback(cloneCommand);
        
        const composeSourcePath = `${tmpPath}/.docker/docker-compose.pr.yml`;
        if(!await filesystem.pathExists(composeSourcePath)) {
            console.error(`No docker-compose.pr.yml found in ${tmpPath}`);
            return;
        }

        const sedPRString = "__PR__";
        const sedPortString = "__PORT__";
        const destComposePath = `${prPath}/docker-compose.yml`;
        const port = await reservePort(prNumber);
        
        // Replace __PR__ and __PORT__ in the compose file and copy it to the prPath
        await executeCommandAtPathCallback(`sed -i 's/${sedPRString}/${prNumber}/g' ${composeSourcePath}`);
        await executeCommandAtPathCallback(`sed -i 's/${sedPortString}/${project.projectDetails?.port || 3000}/g' ${composeSourcePath}`);
        await executeCommandAtPathCallback(`sed -i 's/${sedPortString}/${port}/g' ${destComposePath}`);
        await fs.copyFile(composeSourcePath, destComposePath);


        // Copy .env if it exists
        copyEnvFile(`${tmpPath}/.env`, `${prPath}/.env`).catch(console.error);

        
        // Clean up the temporary directory
        await fs.rm(tmpPath, { recursive: true, force: true });


        // Start the container
        await executeCommandAtPathCallback(`docker-compose up -d`, prPath);

        // Create caddy config
        await updateCaddyConfig(prNumber, port, project.basePath);


    }
}

async function copyEnvFile(sourcePath: string, destPath: string) {
    if(await filesystem.pathExists(sourcePath)) {
        await fs.copyFile(sourcePath, destPath);
    }
}

async function updateCaddyConfig(prNumber: string, port: number, configTemplate: string) {
    const destPath = `/docker/caddy/conf.d/pr-${prNumber}-ventry.m.loeffler.de.caddy`;
    const templatePath = path.join(configTemplate, "templates", "caddy-pr.conf");
    if(!await filesystem.pathExists(templatePath)) {
        console.error(`Caddy template not found at ${templatePath}`);
        return;
    }

    await executeCommandAtPathCallback(`sed -e 's/__PR__/${prNumber}/g' -e 's/__PORT__/${port}/g' ${templatePath} > ${destPath}`);
    await executeCommandAtPathCallback(`docker exec caddy caddy reload --config /etc/caddy/conf.d/pr-${prNumber}-ventry.m-loeffler.de.caddy`);

}

async function reservePort(prNumber: string): Promise<number> {
    await PortDictionary.isInstalled();
    for(let port = 50_000; port <= 50_999; port++) {
        if(!(await PortDictionary.isTaken(port))) {
            await PortDictionary.setPort(port, `ventry-pr-${prNumber}`);
            return port;
        }
    }
    throw new Error("No available ports found in the range 50000-50999");
}