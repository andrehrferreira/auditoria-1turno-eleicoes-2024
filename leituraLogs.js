import * as fs from "fs";
import * as path from "path";
import Seven from "node-7z";
import fg from "fast-glob";
import * as cliProgress from "cli-progress";

process.on('uncaughtException', function(err) {
    console.log(err)
});

let CSVTimeoutAnalise = path.resolve(`./votoTimeoutCurto.csv`);
let CSVTimeoutImprovavel = path.resolve(`./votoTimeoutImprovavel.csv`);

class LeituraLogs {
    async unzip(file){
        const id = path.basename(file);
        const logTxt = path.basename(file);
        const removeRoot = file.replace(path.resolve("./"), "").replace("/DownloadLogs/downloads/", "");
        const unzipDir = path.resolve("./tmp") + '/' + id.replace(".jez", "");

        if(!await fs.existsSync(path.resolve(`./LogsSummary`)))
            await fs.mkdirSync(path.resolve(`./LogsSummary`));

        await new Promise(async (resolve, reject) => {
            try{
                const logTxtFilename = path.resolve(`./LogsParsed/${logTxt.replace(".jez", ".txt")}`);

                if(!await fs.existsSync(logTxtFilename)){
                    if(!await fs.existsSync(unzipDir))
                        await fs.mkdirSync(unzipDir);

                    const archive = Seven.extractFull(file, unzipDir, { $progress: false }); 

                    archive.on('error', async (err) => { 
                        console.log(err)
                        try{ await fs.rmSync(unzipDir, { recursive: true, force: true }); } catch(e){}
                        resolve(); 
                    });

                    archive.on('end', async () => {
                        const bufferISO = await fs.readFileSync(`${unzipDir}/logd.dat`, "latin1");
                        await fs.writeFileSync(logTxtFilename, bufferISO, "utf-8");
                        const logSummary = await this.parseData(bufferISO, true);
                        await fs.writeFileSync(path.resolve(`./LogsSummary/${logSummary.municipio}-${logSummary.zona}-${logSummary.secao}.json`), JSON.stringify(logSummary, null, 4), "utf-8");
                        try{ await fs.rmSync(unzipDir, { recursive: true, force: true }); } catch(e){ console.log(e) }                        
                        resolve();
                    });
                } 
                else{
                    const buffer = await fs.readFileSync(logTxtFilename, "utf-8");
                    const logSummary = await this.parseData(buffer);
                    await fs.writeFileSync(path.resolve(`./LogsSummary/${logSummary.municipio}-${logSummary.zona}-${logSummary.secao}.json`), JSON.stringify(logSummary, null, 4), "utf-8");
                    //console.log(`Atualizando ${logSummary.municipio}-${logSummary.zona}-${logSummary.secao}.json - ${counter} / ${total}`);
                    resolve();
                }              
            }
            catch(e){
               
                resolve();
            }
        }); 
    }

    async parseData(buffer, newLog = false){
        const lines = buffer.split("\n");
        let awaitVoto = null;
        let eleitorHabilitado = null;
        let finishVoto = null;
        let lastVoto = null;
        let mesarioDigitandoTitulo = null;
        let solicitacaoDigital = false;
        let digitalTentativas = 0;
        let CSVFilename = null;

        let logSummary = {
            municipio: null,
            zona: null,
            secao: null,
            serialMR: null,
            modeloUrna: null,
            "logs": []
        };

        for(let line of lines){
            /*if(logSummary.municipio && logSummary.zona && logSummary.secao && !CSVFilename && newLog){
                CSVFilename = path.resolve(`./LogsSummary/${logSummary.municipio}-${logSummary.zona}-${logSummary.secao}.csv`);

                if(await fs.existsSync(CSVFilename))
                    await fs.unlinkSync(CSVFilename)
                
                await fs.writeFileSync(CSVFilename, "MUN,ZONA,SECAO,SERIAL,MODELOURNA,DH_ULTIMO,DH_LIBERADO,SI_LIBERADO,DH_DIGITANDOTITULO,SI_DIGITANDOTITULO,DH_HABILITADO,SI_HABILITADO,DH_VOTOCOMPUTADO,SI_VOTOCOMPUTADO,DIFF_ANTERIOR, DIFF_COMPUTADO, DIFF_DIGITATITULO, SOLICITADIGITAL, TENTATIVAS_DIGITAL\n");
            }*/

            const [dataHora, logLevel, cod, logRef, logDesc, logSign] = line.split("	");
            const [data, hora] = dataHora.split(" ");

            if(data == "06/10/2024"){
                let type = null;
                                            
                switch(logDesc){
                    case "Início das operações do logd": type = "STARTLOG"; break;
                    case "Gerando relatório [ZERÉSIMA] [INÍCIO]": type = "ZERESIMA"; break;
                    case "Urna pronta para receber votos": type = "STARVOTOS"; break;
                    case "Identificador do eleitor digitado pelo mesário": mesarioDigitandoTitulo = { dataHora, logLevel, cod, logRef, logDesc, logSign }; break;
                    case "Aguardando digitação do identificador do eleitor": awaitVoto = { dataHora, logLevel, cod, logRef, logDesc, logSign }; break;
                    case "Eleitor foi habilitado": eleitorHabilitado = { dataHora, logLevel, cod, logRef, logDesc, logSign }; break;
                    case "O voto do eleitor foi computado": finishVoto = { dataHora, logLevel, cod, logRef, logDesc, logSign }; break;
                }

                if(logDesc.includes("Município:"))
                    logSummary.municipio = logDesc.replace("Município: ", "");
                else if(logDesc.includes("Zona Eleitoral:"))
                    logSummary.zona = logDesc.replace("Zona Eleitoral: ", "");
                else if(logDesc.includes("Seção Eleitoral: "))
                    logSummary.secao = logDesc.replace("Seção Eleitoral: ", "");
                else if(logDesc.includes("Serial da MV: "))
                    logSummary.serialMR = logDesc.replace("Serial da MV: ", "");
                else if(logDesc.includes("Identificação do Modelo de Urna: "))
                    logSummary.modeloUrna = logDesc.replace("Identificação do Modelo de Urna: ", "");
                else if(logDesc.includes("Solicita digital ")){
                    solicitacaoDigital = true;
                    digitalTentativas++;
                }

                if(type){
                    logSummary.logs.push({
                        data: data,
                        hora: hora,
                        cod: cod,
                        desc: logDesc,
                        sign: logSign,
                        type
                    });
                }    
                else if(awaitVoto && finishVoto){
                    const dateVotoAnterior = (lastVoto) ? new Date(this.convertData(lastVoto)).getTime() : null;
                    const dateEsperadeDigitacao = new Date(this.convertData(awaitVoto.dataHora)).getTime();
                    const dateHabilitacao = new Date(this.convertData(eleitorHabilitado.dataHora)).getTime();
                    const dateVotoComputador = new Date(this.convertData(finishVoto.dataHora)).getTime();
                    const diffTimeDigitandoTitulo = (mesarioDigitandoTitulo) ? (new Date(this.convertData(mesarioDigitandoTitulo.dataHora)).getTime() - dateEsperadeDigitacao) / 1000 : null;

                    logSummary.logs.push({
                        dataHoraVotoAnterior: lastVoto,
                        dataHoraLiberacaoUrna: awaitVoto.dataHora,
                        signLiberacaoUrna: awaitVoto.logSign,
                        dataHoraTituloDigitado: mesarioDigitandoTitulo.dataHora,
                        signTituloDigitado: mesarioDigitandoTitulo.logSign,
                        dataHoraHabilitacaoEleitor: eleitorHabilitado.dataHora,
                        signHabilitacaoEleitor: eleitorHabilitado.logSign,
                        dataHoraVotoComputado: finishVoto.dataHora,
                        signVotoComputado: finishVoto.logSign,
                        diffTimeDigitandoTitulo: diffTimeDigitandoTitulo,
                        diffTimeHabilitacaoComputado: (dateVotoComputador - dateHabilitacao) / 1000,
                        dffTimeVotoAnteriorHabilitacao: (dateVotoComputador - dateVotoAnterior) / 1000,
                        diffTimeHabilitacaoComputadoStr: this.timerToString((dateVotoComputador - dateHabilitacao) / 1000),
                        dffTimeVotoAnteriorHabilitacaoStr: this.timerToString((dateVotoComputador - dateVotoAnterior) / 1000),
                        diffTimeDigitandoTituloStr: (diffTimeDigitandoTitulo) ? this.timerToString(diffTimeDigitandoTitulo) : null,
                        solicitacaoDigital,
                        digitalTentativas
                    });

                    let reportCSVObject = [
                        logSummary.municipio, logSummary.zona, logSummary.secao, logSummary.serialMR, logSummary.modeloUrna,
                        lastVoto, awaitVoto.dataHora, awaitVoto.logSign, mesarioDigitandoTitulo.dataHora,
                        mesarioDigitandoTitulo.logSign, eleitorHabilitado.dataHora, eleitorHabilitado.logSign,
                        finishVoto.dataHora, finishVoto.logSign, this.timerToString((dateVotoComputador - dateVotoAnterior) / 1000),
                        this.timerToString((dateVotoComputador - dateHabilitacao) / 1000), (diffTimeDigitandoTitulo) ? this.timerToString(diffTimeDigitandoTitulo) : null,
                        solicitacaoDigital, digitalTentativas
                    ];

                    //if(CSVFilename && newLog)
                    //    await fs.appendFileSync(CSVFilename, reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "") + "\n", "utf-8");

                    if(((dateVotoComputador - dateVotoAnterior) / 1000) <= 40)
                        await fs.appendFileSync(CSVTimeoutAnalise, reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "") + "\n", "utf-8");
                    
                    if(((dateVotoComputador - dateVotoAnterior) / 1000) <= 20)
                        await fs.appendFileSync(CSVTimeoutImprovavel, reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "") + "\n", "utf-8");
                    
                    lastVoto = finishVoto.dataHora;
                    awaitVoto = null;
                    eleitorHabilitado = null;
                    finishVoto = null;
                    solicitacaoDigital = false;
                    digitalTentativas = 0;
                }                       
            }
        }

        return logSummary;
    }

    async parseJSON(data, CSVTimeoutAnalise, CSVTimeoutImprovavel){
        for(let log of data.logs){
            if(log.dataHoraVotoAnterior){

                let reportCSVObject = [
                    data.municipio, data.zona, data.secao, data.serialMR, data.modeloUrna,
                    log.dataHoraVotoAnterior, log.dataHoraLiberacaoUrna, log.signLiberacaoUrna, log.dataHoraTituloDigitado,
                    log.signTituloDigitado, log.dataHoraHabilitacaoEleitor, log.signHabilitacaoEleitor,
                    log.dataHoraVotoComputado, log.signVotoComputado, log.diffTimeHabilitacaoComputadoStr,
                    log.dffTimeVotoAnteriorHabilitacaoStr, log.diffTimeDigitandoTituloStr,
                    log.solicitacaoDigital, log.digitalTentativas
                ];
    
                //if(log.dffTimeVotoAnteriorHabilitacao <= 40)
                //    await fs.appendFileSync(CSVTimeoutAnalise, reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "") + "\n", "utf-8");
                
                //if(log.dffTimeVotoAnteriorHabilitacao <= 20)
                //    await fs.appendFileSync(CSVTimeoutImprovavel, reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "") + "\n", "utf-8");
            }
        }
    }

    convertData(dataHora){
        if(typeof dataHora == "string"){
            const [data, hora] = dataHora.split(" ");
            const [dia, mes, ano] = data.split("/");
            return `${ano}-${mes}-${dia} ${hora}`;
        }
        else{
            return ""
        }
    }

    timerToString(time){
        if(time < 60)
            return `${time} seg`;
        if(time > 60 && time < 3600)
            return `${(time/60).toFixed(0)} min`;
        if(time > 3600)
            return `${(time/3600).toFixed(0)} h`;
    }
}

(async () => {
   
    if(await fs.existsSync(CSVTimeoutAnalise))
        await fs.unlinkSync(CSVTimeoutAnalise);

    if(await fs.existsSync(CSVTimeoutImprovavel))
        await fs.unlinkSync(CSVTimeoutImprovavel);

    await fs.writeFileSync(CSVTimeoutAnalise, "MUN,ZONA,SECAO,SERIAL,MODELOURNA,DH_ULTIMO,DH_LIBERADO,SI_LIBERADO,DH_DIGITANDOTITULO,SI_DIGITANDOTITULO,DH_HABILITADO,SI_HABILITADO,DH_VOTOCOMPUTADO,SI_VOTOCOMPUTADO,DIFF_ANTERIOR, DIFF_COMPUTADO, DIFF_DIGITATITULO, SOLICITADIGITAL, TENTATIVAS_DIGITAL\n");
    await fs.writeFileSync(CSVTimeoutImprovavel, "MUN,ZONA,SECAO,SERIAL,MODELOURNA,DH_ULTIMO,DH_LIBERADO,SI_LIBERADO,DH_DIGITANDOTITULO,SI_DIGITANDOTITULO,DH_HABILITADO,SI_HABILITADO,DH_VOTOCOMPUTADO,SI_VOTOCOMPUTADO,DIFF_ANTERIOR, DIFF_COMPUTADO, DIFF_DIGITATITULO, SOLICITADIGITAL, TENTATIVAS_DIGITAL\n");

    const files = await fg(`./DownloadLogs/downloads/*.jez`, { onlyFiles: true });
    const leituraLogs = new LeituraLogs();

    let promises = [];
    let counter = 0;

    for(let log of files){
        counter++;
        
        promises.push(leituraLogs.unzip(path.resolve(log), counter, files.length));

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