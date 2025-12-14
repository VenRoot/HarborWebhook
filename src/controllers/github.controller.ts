import { Request, Response } from "express";
import ConfigService from "../config";
import fs from "fs/promises";
import path from "path";
import ConfigType from "../types/config.interface";
import { GithubService } from "../services/github.service";
import { DockerService } from "../services/docker.service";

export class GithubController {
    private configService: ConfigService;
    private githubService: GithubService;
    private dockerService: DockerService;

    constructor() {
        this.configService = new ConfigService();
        this.githubService = new GithubService();
        this.dockerService = new DockerService();
    }

    public announce = async (req: Request, res: Response) => {
        try {
            const { harbor_repo_full_name, tag, git } = req.body;

            if (!harbor_repo_full_name || !tag) {
                return res.status(400).json({ message: "Missing required fields: harbor_repo_full_name, tag" });
            }

            // If git info is not provided, we can't pull from GitHub
            if (!git || !git.author || !git.repo) {
                 return res.status(400).json({ message: "Missing required fields: git (author, repo) is required for fetching compose file." });
            }

            const relativePath = harbor_repo_full_name; // e.g., "ventry/app"
            const fullPath = path.join(this.configService.basePath, relativePath);

            // 1. Prepare Directory
            await fs.mkdir(fullPath, { recursive: true });

            // 2. Fetch docker-compose.yml from GitHub
            let composeContent: string;
            try {
                composeContent = await this.githubService.fetchDockerCompose(git.author, git.repo);
            } catch (error: any) {
                console.error(`Failed to fetch compose for ${harbor_repo_full_name}:`, error.message);
                return res.status(502).json({ message: "Failed to fetch docker-compose.yml from GitHub", error: error.message });
            }

            // 3. Write file temporarily to validate? Or just write and validate.
            // Writing directly since we are in a specific project dir.
            await fs.writeFile(path.join(fullPath, "docker-compose.yml"), composeContent);

            // 4. Validate Configuration
            try {
                await this.dockerService.validateCompose(fullPath);
            } catch (error) {
                console.error(`Validation failed for ${harbor_repo_full_name}`);
                // Optionally remove the bad file? 
                // await fs.unlink(path.join(fullPath, "docker-compose.yml"));
                return res.status(422).json({ message: "Fetched docker-compose.yml is invalid.", error: "Config validation failed" });
            }

            // 5. Update Config
            const newConfig: ConfigType = {
                fullName: harbor_repo_full_name,
                tag: tag,
                basePath: fullPath,
                git: { author: git.author, repo: git.repo }
            };
            this.configService.addOrUpdateConfig(newConfig);

            // 6. Deploy (Pull & Up)
            try {
                console.log(`Starting deployment for ${harbor_repo_full_name}...`);
                await this.dockerService.deploy(fullPath);
            } catch (error) {
                 return res.status(500).json({ message: "Configuration valid, but deployment failed.", error: "Deploy failed" });
            }

            console.log(`Announced, configured, and deployed: ${harbor_repo_full_name}:${tag}`);
            return res.status(200).json({ message: "Project configured and deployed successfully", config: newConfig });

        } catch (error: any) {
            console.error("Announce error:", error);
            return res.status(500).json({ message: "Internal Server Error", error: error.message });
        }
    };
}
