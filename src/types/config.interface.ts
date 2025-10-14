type EnvTags = "latest" | "dev";

type Config = {
    basePath: string;
    fullName: string;
    tag: EnvTags | (string & { _?: never})
    git: GitProps,
    projectDetails?: ProjectDetails;
};


type GitProps = {
    author: string;
    repo: string;
    fullUrl: string;
}

type Configs = {
    configs: Config[];
} 

type ProjectDetails = {
    envType: "main" | "dev" | "pr";
    host: string;
    port: number;
    serviceName: string;
}

export default Config;
export { Configs, Config as ConfigType };