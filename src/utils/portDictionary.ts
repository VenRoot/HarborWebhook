import { exec } from "node:child_process";

class PortDictionary {
    async test () {

    }

    static async isInstalled(): Promise<true> {
        return new Promise((resolve, reject) => {
            exec("command -v portDictionary", (error, stdout, stderr) => {
                if (error) {
                    reject(false);
                }
                resolve(true);
            });
        });
    }

    static async isTaken(port: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            exec(`portDictionary get ${port}`, (error, stdout, stderr) => {
                if (error) {
                    resolve(false);
                }
                resolve(stdout.trim() === "taken");
            });
        });
    }

    static async setPort(port: number, service: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(`portDictionary set ${port} ${service}`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }

    static async releasePort(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(`portDictionary delete ${port}`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });

    }

}

export default PortDictionary;