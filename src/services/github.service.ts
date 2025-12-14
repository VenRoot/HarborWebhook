import fs from "fs";
import stream from "stream";

export class GithubService {
    private githubToken: string;

    constructor() {
        // Fallback to empty string if not set, handled in logic or headers
        this.githubToken = process.env.GITHUB_TOKEN || "";
    }

    /**
     * Tries to fetch docker-compose.yml from the root or .docker/ directory of the repo.
     * @param owner The GitHub username/org.
     * @param repo The GitHub repository name.
     * @returns The content of the docker-compose.yml file.
     * @throws Error if not found in either location.
     */
    public async fetchDockerCompose(owner: string, repo: string): Promise<string> {
        // Try root first
        try {
            console.log(`Attempting to fetch docker-compose.yml from ${owner}/${repo} (root)`);
            return await this.fetchFile(owner, repo, "docker-compose.yml");
        } catch (error) {
            console.log("Root docker-compose.yml not found, trying .docker/docker-compose.yml");
        }

        // Try .docker/ directory
        try {
            return await this.fetchFile(owner, repo, ".docker/docker-compose.yml");
        } catch (error) {
            console.error(`Failed to fetch docker-compose.yml from ${owner}/${repo} in both locations.`);
            throw new Error(`docker-compose.yml not found in ${owner}/${repo} (checked root and .docker/)`);
        }
    }

    private async fetchFile(owner: string, repo: string, path: string): Promise<string> {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        
        const headers: HeadersInit = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "HarborDeploy-Server"
        };

        if (this.githubToken) {
            headers["Authorization"] = `Bearer ${this.githubToken}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data && typeof data === 'object' && 'download_url' in data && typeof data.download_url === 'string') {
            const fileResponse = await fetch(data.download_url);
            if (!fileResponse.ok) {
                throw new Error(`Failed to download raw file content: ${fileResponse.statusText}`);
            }
            return await fileResponse.text();
        } else {
            throw new Error("Invalid GitHub API response structure");
        }
    }
}
