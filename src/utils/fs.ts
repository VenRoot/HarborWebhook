import fs from "node:fs/promises";

class filesystem {
    static async pathExists(path: string): Promise<boolean> {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }
}

export default filesystem;