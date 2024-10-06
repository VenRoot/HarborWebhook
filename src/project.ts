import { response } from "express";
import Config from "./types/config.interface";
import fs from "fs";
import fsPromises from "fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import stream from "node:stream"
import { exec } from "node:child_process";

class Project {
    private readonly config: Config;
    private readonly usernameRegex = /^[a-zA-Z0-9](?:-?[a-zA-Z0-9]){0,38}$/;
    private readonly repoRegex = /^[a-zA-Z0-9._-]+$/;
    private readonly githubToken: string;

    private isValidUsername() {
        return this.repoRegex.test(this.config.git.author);
    }
    private isValidRepo() {
        return this.repoRegex.test(this.config.git.repo);
    }

    constructor(config: Config, githubToken: string) {        
        this.config = config;
        this.githubToken = githubToken;
    }

    public async updateCompose() {

        const tmp = (await fsPromises.mkdtemp(join(tmpdir(), "webhook-"))).replaceAll("X", "");
        const outputPath = join(tmp, "file");
        const composePath = join(this.config.basePath, "docker-compose.yml")

        await this.downloadCompose(outputPath);
        await this.moveCompose(outputPath, composePath);
        await this.pullCompose(composePath);

    }

    private async moveCompose(filePath: string, destFile: string) {
        await fsPromises.copyFile(filePath, destFile);
    }

    private async pullCompose(filePath: string) {
        const command = "docker compose up -d";

        return new Promise<void>((resolve, reject) => { 
            exec(command, {cwd: filePath}, (error, stdout, stderr) => {
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

    private async downloadCompose(outputPath: string) {
        // https://api.github.com/repos/VenRoot/MindlessMaze/contents/.gitignore

        const { author, repo } = this.config.git;
        const options: RequestInit = {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${this.githubToken}`,
                "X-GitHub-Api-Version": "2022-11-28"
            }
        };

        const url = `https://api.github.com/repos/${author}/${repo}/contents/docker-compose.yml`;
        const content = await ((await fetch(url, options)).json());

        if(!(content instanceof Object && "download_url" in content && typeof content.download_url === "string")) throw new Error("Received wrong json response from github");

        const fileRequest = await fetch(content.download_url);
        if(!fileRequest.ok) throw new Error("Error downloading file from github");
        if(!fileRequest.body) throw new Error("Body is not defined");

        const fileStream = fs.createWriteStream(outputPath);
        stream.Readable.fromWeb(fileRequest.body as any).pipe(fileStream);
        console.log("Writing to "+outputPath);
        return new Promise<void>((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
          });

    }
}

export default Project;