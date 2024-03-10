import type { Event } from "./payload.interface";

type Config = Event & {
    basePath: string;
};

type Configs = {
    configs: Config[];
} 
    

export default Config;
export { Configs };