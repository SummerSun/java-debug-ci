import fs from 'fs-plus'
import path from 'path'

import childProcess from "child_process";


export async function resolveJdkPath() {
    const isWindows = (process.platform === "win32");
    const isMacintosh = (process.platform === "darwin");
    const isLinux = (process.platform === "linux");
    if (isWindows) {
        const WinReg = require("winreg");
        function getRegistryValues(hive, key, name) {
            return new Promise((resolve, reject) => {
                try {
                    const regKey = new WinReg({
                        hive,
                        key,
                    });

                    regKey.valueExists(name, (e, exists) => {
                        if (e) {
                            return reject(e);
                        }
                        if (exists) {
                            regKey.get(name, (err, result) => {
                                if (!err) {
                                    resolve(result ? result.value : "");
                                } else {
                                    reject(err);
                                }
                            });
                        } else {
                            resolve("");
                        }
                    });
                } catch (ex) {
                    reject(ex);
                }
            });
        }
        let currentVersion = await getRegistryValues(WinReg.HKLM,
            "\\SOFTWARE\\JavaSoft\\Java Development Kit",
            "CurrentVersion");
        let WOW6432Node = false;
        if (!currentVersion) {
            currentVersion = await getRegistryValues(WinReg.HKLM,
                "\\SOFTWARE\\WOW6432Node\\JavaSoft\\Java Development Kit",
                "CurrentVersion");
            WOW6432Node = true;
        }
        let pathString = "";
        if (currentVersion) {
            pathString = await getRegistryValues(WinReg.HKLM,
                (WOW6432Node? "\\SOFTWARE\\WOW6432Node\\JavaSoft\\Java Development Kit\\" : "\\SOFTWARE\\JavaSoft\\Java Development Kit\\") + currentVersion,
                "JavaHome");
        }

        if (fs.isDirectorySync(pathString)) {
            return pathString;
        }
        try {
            pathString = childProcess.execSync("where java", { encoding: "utf8" });
        } catch (error) {
            // when "where java"" execution fails, the childProcess.execSync will throw error, just ignore it
            console.log(error);
            return "";
        }
        pathString = pathString.trim().split('\n')[0].trim();
        pathString = path.resolve(pathString);
        if (fs.isFileSync(pathString)) {
            // C:\Program Files\Java\jdk1.8.0_131\bin\java.exe => C:\Program Files\Java\jdk1.8.0_131
            pathString = path.dirname(path.dirname(path.resolve(pathString)));
        }

        return pathString;
    } else if (isMacintosh || isLinux) {
        return new Promise((resolve, reject) => {
            require('find-java-home')(function(err, home){
                if(err) reject(err);
                else resolve(home);
            });
        });

    }

}

