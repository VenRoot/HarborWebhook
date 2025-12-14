import { exec } from "child_process";

export class DockerService {
    /**
     * Executes a command in a specific directory.
     * @param command The command to execute.
     * @param path The working directory.
     */
    private executeCommandAtPath(command: string, path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`Executing: "${command}" in ${path}`);
            exec(command, { cwd: path }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing command: ${command}`, error);
                    console.error(`stderr: ${stderr}`);
                    return reject(error);
                }
                if (stderr) {
                    console.warn(`Command stderr: ${stderr}`);
                }
                if (stdout) {
                    console.log(`Command stdout: ${stdout}`);
                }
                resolve();
            });
        });
    }

    /**
     * Pulls the latest images and restarts the services using docker compose.
     * @param basePath Path to the directory containing docker-compose.yml
     */
    public async deploy(basePath: string): Promise<void> {
        try {
            await this.executeCommandAtPath("docker compose pull", basePath);
            await this.executeCommandAtPath("docker compose up -d", basePath);
            
            // Prune unused images to save space
            await this.pruneImages(basePath);
        } catch (error) {
            console.error("Deployment failed:", error);
            throw error;
        }
    }

    /**
     * Prunes unused docker images.
     */
    private async pruneImages(basePath: string): Promise<void> {
        try {
            await this.executeCommandAtPath("docker image prune -f", basePath);
        } catch (error) {
            // Non-critical error, just log it
            console.warn("Failed to prune images:", error);
        }
    }

    /**
     * Validates the docker-compose.yml file in the given path.
     * @param basePath Path to the directory containing docker-compose.yml
     */
    public async validateCompose(basePath: string): Promise<void> {
        // 'docker compose config' parses and validates the compose file.
        // It returns 0 on success, non-zero on failure.
        try {
            await this.executeCommandAtPath("docker compose config", basePath);
        } catch (error) {
            throw new Error("Invalid docker-compose.yml configuration.");
        }
    }
}
