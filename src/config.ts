import fs from "fs";
import path from "path";
import type ConfigType from "./types/config.interface";

export class ConfigService {
    private configPath: string;

    constructor() {
        this.configPath = path.resolve(process.cwd(), "config.json");
    }

    private loadConfigs(): ConfigType[] {
        try {
            if (fs.existsSync(this.configPath)) {
                const configFile = fs.readFileSync(this.configPath, "utf8");
                return JSON.parse(configFile);
            }
        } catch (error) {
            console.error("Failed to load config.json:", error);
        }
        return [];
    }

    private saveConfigs(configs: ConfigType[]): void {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(configs, null, 2), "utf8");
        } catch (error) {
            console.error("Failed to save config.json:", error);
            throw error;
        }
    }

    public getConfigByFullNameAndTag(fullName: string, tag: string): ConfigType | undefined {
        const configs = this.loadConfigs();
        return configs.find((config) => config.fullName === fullName && config.tag === tag);
    }

    public addOrUpdateConfig(newConfig: ConfigType): void {
        const configs = this.loadConfigs();
        const index = configs.findIndex(c => c.fullName === newConfig.fullName && c.tag === newConfig.tag);

        if (index !== -1) {
            configs[index] = newConfig;
        } else {
            configs.push(newConfig);
        }

        this.saveConfigs(configs);
    }

    public get basePath(): string {
        return process.env.BASE_PATH || '/var/lib/docker';
    }
}

export default ConfigService;