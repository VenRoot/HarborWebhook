import type IConfig from "./types/config.interface";
import type { Configs } from "./types/config.interface";
import fs from "fs";
import path from "path";

class Config implements Configs {
    configs: IConfig[];

    constructor() {
        const configFile = fs.readFileSync(path.resolve(process.cwd(), "config.json"), "utf8");
        this.configs = JSON.parse(configFile);
    }

    public getConfigByFullNameAndTag(fullName: string, tag: string): IConfig | undefined {
        return this.configs.find((config) => config.full_name === fullName && config.tag === tag);
    }

    public get basePath(): string {
        return process.env.BASE_PATH || '/var/lib/docker';
    }
}

export default Config;