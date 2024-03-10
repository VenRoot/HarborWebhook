class Project {
    readonly basePath: string;
    readonly composePath: string;
    readonly tag: string;
    readonly repo_name: string;


    constructor(basePath: string, composePath: string, tag: string, repo_name: string) {
        this.basePath = basePath;
        this.composePath = composePath;
        this.tag = tag;
        this.repo_name = repo_name;
    }
}

export default Project;