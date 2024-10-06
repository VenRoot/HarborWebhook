type Config = {
    basePath: string;
    fullName: string;
    tag: string;
    git: GitProps
};


type GitProps = {
    author: string;
    repo: string;
}

type Configs = {
    configs: Config[];
} 
    

export default Config;
export { Configs };