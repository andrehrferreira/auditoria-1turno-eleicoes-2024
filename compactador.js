import * as fs from "fs";
import archiver from "archiver";
import fg from "fast-glob";

(async () => {
    //Clear
    const dataParsedFilesExists = await fg("./DataParsed/**/*.zip");

    for(let file of dataParsedFilesExists)
        await fs.unlinkSync(file);

    const busFilesExists = await fg("./BUs/**/*.zip");

    for(let file of busFilesExists)
        await fs.unlinkSync(file);

    if(fs.existsSync(`bus-binary.zip`))
        await fs.unlinkSync(`bus-binary.zip`);

    //Data Parsed
    const outputdp = fs.createWriteStream(`dp-${new Date().getTime()}.zip`);
    const archivedp = archiver('zip');
    archivedp.pipe(outputdp);
    archivedp.directory("./DataParsed", false);
    await archivedp.finalize();

    //BUs Binary
    const outputbubin = fs.createWriteStream(`bin-${new Date().getTime()}.zip`);
    const archivebubin = archiver('zip');
    archivebubin.pipe(outputbubin);
    archivebubin.directory("./Binary", false);
    await archivebubin.finalize();

    //BUs
    const outputbu = fs.createWriteStream(`bu-${new Date().getTime()}.zip`);
    const archivebu = archiver('zip');
    archivebu.pipe(outputbu);
    archivebu.directory("./BUs", false);
    await archivebu.finalize();

    //Logs
    const outputlogs = fs.createWriteStream(`logs-${new Date().getTime()}.zip`);
    const archivelogs = archiver('zip');
    archivelogs.pipe(outputlogs);
    archivelogs.directory("./DownloadLogs", false);
    await archivelogs.finalize();
})();