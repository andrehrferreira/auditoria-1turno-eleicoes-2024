import * as fs from "fs";
import fg from "fast-glob";
import * as cliProgress from "cli-progress";
const municipios = JSON.parse(fs.readFileSync("municipios.json", "utf8"));

(async () => {
    const files = await fg("./DataParsed/**/*json");

    let maxVotosBoulos = 0;
    let maxVotosMarcal = 0;
    let maxVotosNunes = 0;
    let maxVotosTabata = 0;

    let mediaEleitoresAptos = 0;
    let totalUrnas = 0;

    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(files.length, 0);

    let reportCSVheader = "MUN,ZONA,SECAO,LOCAL,URNA,SERIEFC,DHCARGA,CODCARGA,DHABERTURA,DHENCERRAMENTO,ELAPTOS,ELCOMPARECIMENTO,BOULOS,MARCAL,NUNES,TABATA\n";

    if(fs.existsSync(`./relatorio-boulos-votacao-expressiva.csv`, `${reportCSVheader}\n`))
        fs.unlinkSync(`./relatorio-boulos-votacao-expressiva.csv`, `${reportCSVheader}\n`)

    if(fs.existsSync(`./relatorio-marcal-votacao-expressiva.csv`, `${reportCSVheader}\n`))
        fs.unlinkSync(`./relatorio-marcal-votacao-expressiva.csv`, `${reportCSVheader}\n`)

    if(fs.existsSync(`./relatorio-nunes-votacao-expressiva.csv`, `${reportCSVheader}\n`))
        fs.unlinkSync(`./relatorio-nunes-votacao-expressiva.csv`, `${reportCSVheader}\n`)

    if(fs.existsSync(`./relatorio-tabata-votacao-expressiva.csv`, `${reportCSVheader}\n`))
        fs.unlinkSync(`./relatorio-tabata-votacao-expressiva.csv`, `${reportCSVheader}\n`)

    if(fs.existsSync(`./relatorio-boulos-votacao-expressiva60.csv`, `${reportCSVheader}\n`))
        fs.unlinkSync(`./relatorio-boulos-votacao-expressiva60.csv`, `${reportCSVheader}\n`)

    if(fs.existsSync(`./relatorio-marcal-votacao-expressiva60.csv`, `${reportCSVheader}\n`))
        fs.unlinkSync(`./relatorio-marcal-votacao-expressiva60.csv`, `${reportCSVheader}\n`)

    if(fs.existsSync(`./relatorio-nunes-votacao-expressiva60.csv`, `${reportCSVheader}\n`))
        fs.unlinkSync(`./relatorio-nunes-votacao-expressiva60.csv`, `${reportCSVheader}\n`)

    if(fs.existsSync(`./relatorio-tabata-votacao-expressiva60.csv`, `${reportCSVheader}\n`))
        fs.unlinkSync(`./relatorio-tabata-votacao-expressiva60.csv`, `${reportCSVheader}\n`)

    fs.appendFileSync(`./relatorio-boulos-votacao-expressiva.csv`, `${reportCSVheader}\n`);
    fs.appendFileSync(`./relatorio-marcal-votacao-expressiva.csv`, `${reportCSVheader}\n`);
    fs.appendFileSync(`./relatorio-nunes-votacao-expressiva.csv`, `${reportCSVheader}\n`);
    fs.appendFileSync(`./relatorio-tabata-votacao-expressiva.csv`, `${reportCSVheader}\n`);

    fs.appendFileSync(`./relatorio-boulos-votacao-expressiva60.csv`, `${reportCSVheader}\n`);
    fs.appendFileSync(`./relatorio-marcal-votacao-expressiva60.csv`, `${reportCSVheader}\n`);
    fs.appendFileSync(`./relatorio-nunes-votacao-expressiva60.csv`, `${reportCSVheader}\n`);
    fs.appendFileSync(`./relatorio-tabata-votacao-expressiva60.csv`, `${reportCSVheader}\n`);

    for(let fileBU of files){
        bar1.increment();  
        const buData = JSON.parse(fs.readFileSync(fileBU, "utf8"));

        const id = `${buData.municipio}-${buData.zona}-${buData.secao}`;
        const municipio = municipios[id];
        
        let votosBoulos = 0;
        let votosMarcal = 0;
        let votosNunes = 0;
        let votosTabata = 0;
        let votosOutros = 0;

        if(!isNaN(parseInt(buData.votos["50"]?.quantidadeVotos)))
            votosBoulos = parseInt(buData.votos["50"]?.quantidadeVotos);

        if(!isNaN(parseInt(buData.votos["28"]?.quantidadeVotos)))
            votosMarcal = parseInt(buData.votos["28"]?.quantidadeVotos);

        if(!isNaN(parseInt(buData.votos["15"]?.quantidadeVotos)))
            votosNunes = parseInt(buData.votos["15"]?.quantidadeVotos);

        if(!isNaN(parseInt(buData.votos["40"]?.quantidadeVotos)))
            votosTabata = parseInt(buData.votos["40"]?.quantidadeVotos);

        if(votosBoulos > maxVotosBoulos)
            maxVotosBoulos = votosBoulos;
        if(votosMarcal > maxVotosMarcal)
            maxVotosMarcal = votosMarcal;
        if(votosNunes > maxVotosNunes)
            maxVotosNunes = votosNunes;
        if(votosTabata > maxVotosTabata)
            maxVotosTabata = votosTabata;

        mediaEleitoresAptos += parseInt(buData.qtdEleitoresAptos);
        totalUrnas++;

        const reportCSVObject = [
            buData.municipio, buData.zona, buData.secao, 
            buData.local, buData.numeroInternoUrna, buData.numeroSerieFC, 
            buData.dataHoraCarga, buData.codigoCarga, buData.dataHoraAbertura, 
            buData.dataHoraEncerramento, buData.qtdEleitoresAptos, buData.qtdComparecimento, 
            buData.votos["50"]?.quantidadeVotos, buData.votos["28"]?.quantidadeVotos,
            buData.votos["15"]?.quantidadeVotos, buData.votos["40"]?.quantidadeVotos
        ];

        let newLine = reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "");

        // Comparar votos expressivos para cada candidato
        const totalVotos = parseInt(buData.qtdComparecimento);
        const votosExpressivosBoulos = votosBoulos > totalVotos * 0.40; // BOULOS tem mais que 40% dos votos
        const votosExpressivosMarcal = votosMarcal > totalVotos * 0.40; // MARCAL tem mais que 40% dos votos
        const votosExpressivosNunes = votosNunes > totalVotos * 0.40;   // NUNES tem mais que 40% dos votos
        const votosExpressivosTabata = votosTabata > totalVotos * 0.40; // TABATA tem mais que 40% dos votos

        const votosExpressivosBoulos60 = votosBoulos > totalVotos * 0.6; // BOULOS tem mais que 60% dos votos
        const votosExpressivosMarcal60 = votosMarcal > totalVotos * 0.6; // MARCAL tem mais que 60% dos votos
        const votosExpressivosNunes60 = votosNunes > totalVotos * 0.6;   // NUNES tem mais que 60% dos votos
        const votosExpressivosTabata60 = votosTabata > totalVotos * 0.6; // TABATA tem mais que 60% dos votos

        if(votosExpressivosBoulos)
            fs.appendFileSync(`./relatorio-boulos-votacao-expressiva.csv`, `${newLine}\n`);
        
        if(votosExpressivosMarcal)
            fs.appendFileSync(`./relatorio-marcal-votacao-expressiva.csv`, `${newLine}\n`);
        
        if(votosExpressivosNunes)
            fs.appendFileSync(`./relatorio-nunes-votacao-expressiva.csv`, `${newLine}\n`);
        
        if(votosExpressivosTabata)
            fs.appendFileSync(`./relatorio-tabata-votacao-expressiva.csv`, `${newLine}\n`);

        if(votosExpressivosBoulos60)
            fs.appendFileSync(`./relatorio-boulos-votacao-expressiva60.csv`, `${newLine}\n`);
        
        if(votosExpressivosMarcal60)
            fs.appendFileSync(`./relatorio-marcal-votacao-expressiva60.csv`, `${newLine}\n`);
        
        if(votosExpressivosNunes60)
            fs.appendFileSync(`./relatorio-nunes-votacao-expressiva60.csv`, `${newLine}\n`);
        
        if(votosExpressivosTabata60)
            fs.appendFileSync(`./relatorio-tabata-votacao-expressiva60.csv`, `${newLine}\n`);
    }
    
    fs.writeFileSync(`minMaxVotosPorCanditado.json`, JSON.stringify({
        maxVotosBoulos,
        maxVotosMarcal,
        maxVotosNunes,
        maxVotosTabata,
        mediaEleitoresAptosPorUrna: (mediaEleitoresAptos / totalUrnas)
    }, null, 4));

    process.exit(1);
})();
