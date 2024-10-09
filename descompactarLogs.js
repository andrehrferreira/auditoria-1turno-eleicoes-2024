import * as fs from "fs";
import * as path from "path";
import Seven from "node-7z";
import fg from "fast-glob";
import * as cliProgress from "cli-progress";

process.on('uncaughtException', function(err) {
    //console.log(err)
});

class LeituraLogs {
    async unzip(file){
        const id = path.basename(file);
        const logTxt = path.basename(file);
        const removeRoot = file.replace(path.resolve("./"), "").replace("/DownloadLogs/downloads/", "");
        const unzipDir = path.resolve("./tmp") + '/' + id.replace(".jez", "");

        if(!await fs.existsSync(path.resolve(`./LogsParsed`)))
            await fs.mkdirSync(path.resolve(`./LogsParsed`));

        await new Promise(async (resolve, reject) => {
            try{
                const logTxtFilename = path.resolve(`./LogsParsed/${logTxt.replace(".jez", ".txt")}`);

                if(!await fs.existsSync(logTxtFilename)){
                    if(!await fs.existsSync(unzipDir))
                        await fs.mkdirSync(unzipDir);

                    console.log(file)
                    console.log(logTxtFilename)

                    const archive = Seven.extractFull(file, unzipDir, { $progress: false }); 

                    archive.on('error', async (err) => { 
                        console.log(err)
                        try{ await fs.rmSync(unzipDir, { recursive: true, force: true }); } catch(e){}
                        resolve(); 
                    });

                    archive.on('end', async () => {
                        const bufferISO = await fs.readFileSync(`${unzipDir}/logd.dat`, "latin1");
                        await fs.writeFileSync(logTxtFilename, bufferISO, "utf-8");
                        try{ await fs.rmSync(unzipDir, { recursive: true, force: true }); } catch(e){ console.log(e) }                        
                        resolve();
                    });
                } 
                else{
                    resolve();
                }              
            }
            catch(e){
               
                resolve();
            }
        }); 
    }
}

(async () => {
   
    const files = await fg(`./DownloadLogs/downloads/*.jez`, { onlyFiles: true });
    const leituraLogs = new LeituraLogs();

    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(files.length, 0);

    let CSVTimeoutAnalise = path.resolve(`./LogsParsed/votoTimeoutCurto.csv`);
    let CSVTimeoutImprovavel = path.resolve(`./LogsParsed/votoTimeoutImprovavel.csv`);

    if(await fs.existsSync(CSVTimeoutAnalise))
        await fs.unlinkSync(CSVTimeoutAnalise);

    if(await fs.existsSync(CSVTimeoutImprovavel))
        await fs.unlinkSync(CSVTimeoutImprovavel);

    let promises = [];

    for(let log of files){
        bar1.increment();  

        promises.push(new Promise(async (resolve, reject) => {
            await leituraLogs.unzip(path.resolve(log));
            resolve();
        }));

        if(promises.length == 100){
            await Promise.all(promises);
            promises = [];
        }                
    }

    if(promises.length > 0){
        await Promise.all(promises);
        promises = [];
    } 

    process.exit(1);
})();