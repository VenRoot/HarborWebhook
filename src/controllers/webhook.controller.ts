import { Request, Response } from "express";
import ConfigService from "../config";
import { DockerService } from "../services/docker.service";
import ProjectInterface from "../types/payload.interface";
import fs from "fs/promises";

export class WebhookController {
    private config: ConfigService;
    private dockerService: DockerService;

    constructor() {
        this.config = new ConfigService();
        this.dockerService = new DockerService();
    }

    public handleWebhook = async (req: Request, res: Response) => {
        try {
            const parsedBody = this.parseBody(req.body);
            if ("error" in parsedBody) {
                return res.status(parsedBody.status).json({ message: "Invalid payload" });
            }

            const { repo_full_name, tag } = parsedBody;
            console.log(`Received webhook for ${repo_full_name}:${tag}`);

            let project = this.config.getConfigByFullNameAndTag(repo_full_name, tag);

            if (!project) {
                console.warn(`No config found for ${repo_full_name}:${tag}. Checking default path...`);
                
                // Fallback: Check if directory exists at default path
                const defaultPath = require("path").join(this.config.basePath, repo_full_name);
                const composePath = require("path").join(defaultPath, "docker-compose.yml");
                
                try {
                    const stats = await fs.stat(composePath);
                    if (stats.isFile()) {
                        console.log(`Found existing docker-compose.yml at ${defaultPath}. Creating config.`);
                        project = {
                            fullName: repo_full_name,
                            tag: tag,
                            basePath: defaultPath,
                            git: { author: "", repo: "" }
                        };
                        // Optionally save this new config?
                        // this.config.addOrUpdateConfig(project); 
                    }
                } catch (e) {
                    // File does not exist
                }
            }

            if (!project) {
                console.warn(`No config and no default docker-compose found for ${repo_full_name}:${tag}`);
                return res.status(404).json({ message: "Project not configured and no local compose file found." });
            }

            try {
                const stats = await fs.stat(project.basePath);
                if (!stats.isDirectory()) {
                    throw new Error("Path is not a directory");
                }
            } catch (e) {
                console.error(`Invalid base path: ${project.basePath}`);
                return res.status(500).json({ message: "Server configuration error: Invalid base path" });
            }

            // Perform deployment
            await this.dockerService.deploy(project.basePath);
            
            return res.status(200).send("OK");

        } catch (err: any) {
            console.error("Webhook processing error:", err);
            return res.status(500).json({ message: "Internal Server Error", error: err.message });
        }
    };

    public testWebhook = async (req: Request, res: Response) => {
        try {
            const parsedBody = this.parseBody(req.body);
            if ("error" in parsedBody) {
                return res.status(parsedBody.status).json({ message: "Invalid payload" });
            }

            const { repo_full_name, tag } = parsedBody;
            const project = this.config.getConfigByFullNameAndTag(repo_full_name, tag);

            if (!project) {
                return res.status(404).json({ message: "Project not configured" });
            }

            try {
                const stats = await fs.stat(project.basePath);
                if (!stats.isDirectory()) {
                    throw new Error("Path is not a directory");
                }
            } catch (e) {
                return res.status(500).send("Path does not exist or is mounted the wrong way. Wrong configuration?");
            }

            return res.status(200).json(project);
        } catch (err: any) {
            console.error("Test webhook error:", err);
            return res.status(500).json(err);
        }
    };

    /**
     * Parsing logic for the Harbor webhook payload.
     */
    private parseBody(body: any): { error: true; status: number } | { repo_full_name: string; tag: string } {
        if (!body) return { error: true, status: 400 };
        
        // Basic validation
        if (!body.event_data?.resources || !Array.isArray(body.event_data.resources)) {
            return { error: true, status: 400 };
        }

        const payload = body as ProjectInterface;
        const eventData = payload.event_data;
        const resource = eventData.resources[0];

        if (!resource?.tag || !eventData.repository?.repo_full_name) {
            return { error: true, status: 400 };
        }

        return {
            repo_full_name: eventData.repository.repo_full_name,
            tag: resource.tag
        };
    }
}
