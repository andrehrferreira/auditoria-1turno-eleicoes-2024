import * as fs from "fs";
import fg from "fast-glob";
import * as cliProgress from "cli-progress";
const municipios = JSON.parse(fs.readFileSync("municipios.json", "utf8"));

(async () => {
    const files = await fg("./DataParsed/**/*json");
    let reportCSV = "";
    let reportCSVVotoEmTransito = ""
    let reportJSON = {};
    let reportJSONVotoEmTransito = {};
    let summayTotal = {
        urnas: 0,
        votos: {
            "BOULOS": 0,
            "NUNES": 0,
            "MARCAL": 0,
            "TABATA": 0,
            "OUTROS": 0,
            "NULOS": 0,
        }
    };

    reportCSV += "MUN,ZONA,SECAO,LOCAL,URNA,SERIEFC,DHCARGA,CODCARGA,DHABERTURA,DHENCERRAMENTO,ELAPTOS,ELCOMPARECIMENTO,BOULOS,MARCAL,NUNES,TABATA,OUTROS,NULO,TOTAL,VENCEDOR,DIFFVENCEDOR\n";
   
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(files.length, 0);

    for(let fileBU of files){
        bar1.increment();  
        const buData = JSON.parse(fs.readFileSync(fileBU, "utf8"));
        const id = `${buData.municipio}-${buData.zona}`;
        const municipio = municipios[id];

        let votosOutros = 0;
        let votosNulos = 0;
        summayTotal.urnas++;

        for(let key in buData.votos){
            if(key !== "50" && key !== "28" && key !== "15" && key !== "40" && key !== "nulo")
                votosOutros += parseInt(buData.votos[key].quantidadeVotos);
            else if(key === "nulo")
                votosNulos = parseInt(buData.votos[key].quantidadeVotos);
        }

        if(!isNaN(parseInt(buData.votos["50"]?.quantidadeVotos)))
            summayTotal.votos["BOULOS"] += parseInt(buData.votos["50"]?.quantidadeVotos);

        if(!isNaN(parseInt(buData.votos["28"]?.quantidadeVotos)))
            summayTotal.votos["MARCAL"] += parseInt(buData.votos["28"]?.quantidadeVotos);

        if(!isNaN(parseInt(buData.votos["15"]?.quantidadeVotos)))
            summayTotal.votos["NUNES"] += parseInt(buData.votos["15"]?.quantidadeVotos);

        if(!isNaN(parseInt(buData.votos["40"]?.quantidadeVotos)))
            summayTotal.votos["TABATA"] += parseInt(buData.votos["40"]?.quantidadeVotos);

        summayTotal.votos["NULOS"] += votosNulos;
        summayTotal.votos["OUTROS"] += votosOutros;

        const total = parseInt(buData.qtdComparecimentoPresidente);

        const votosCandidatos = [
            { nome: "BOULOS", votos: parseInt(buData.votos["50"]?.quantidadeVotos) || 0 },
            { nome: "MARCAL", votos: parseInt(buData.votos["28"]?.quantidadeVotos) || 0 },
            { nome: "NUNES", votos: parseInt(buData.votos["15"]?.quantidadeVotos) || 0 }, 
            { nome: "TABATA", votos: parseInt(buData.votos["40"]?.quantidadeVotos) || 0 } 
        ];

        votosCandidatos.sort((a, b) => b.votos - a.votos);
        const vencedor = votosCandidatos[0].nome;
        const segundoLugar = votosCandidatos[1].nome;
        const diffVencedor = votosCandidatos[0].votos - votosCandidatos[1].votos;

        console.log(`Vencedor: ${vencedor} com diferença de ${diffVencedor} votos sobre o segundo lugar (${segundoLugar}).`);

        const reportCSVObject = [
            buData.municipio, buData.zona, buData.secao, 
            buData.local, buData.numeroInternoUrna, buData.numeroSerieFC, 
            buData.dataHoraCarga, buData.codigoCarga, buData.dataHoraAbertura, 
            buData.dataHoraEncerramento, buData.qtdEleitoresAptos, buData.qtdComparecimento, 
            buData.votos["50"]?.quantidadeVotos, buData.votos["28"]?.quantidadeVotos,
            buData.votos["15"]?.quantidadeVotos, buData.votos["40"]?.quantidadeVotos,
            votosOutros, votosNulos, total, vencedor, diffVencedor
        ];

        let newLine = reportCSVObject.join(",").replace(/\r/img, "").replace(/\n/img, "");
        reportCSV += `${newLine}\n`;

        reportJSON[id] = {
            ...buData,
            municipio,
            vencedor,
            diffVencedor
        };

        fs.appendFileSync(`./relatorio-${municipio?.estadoSingla}.csv`, `${newLine}\n`);
    }

    summayTotal.urnas = summayTotal.urnas.toLocaleString("pt-BR");
    summayTotal.votos["BOULOS"] = summayTotal.votos["BOULOS"].toLocaleString("pt-BR");
    summayTotal.votos["MARCAL"] = summayTotal.votos["MARCAL"].toLocaleString("pt-BR");
    summayTotal.votos["NUNES"] = summayTotal.votos["NUNES"].toLocaleString("pt-BR");
    summayTotal.votos["TABATA"] = summayTotal.votos["TABATA"].toLocaleString("pt-BR");
    summayTotal.votos["NULOS"] = summayTotal.votos["NULOS"].toLocaleString("pt-BR");
    summayTotal.votos["OUTROS"] = summayTotal.votos["OUTROS"].toLocaleString("pt-BR");

    fs.writeFileSync("./relatorio.csv", reportCSV);
    fs.writeFileSync("./sumarioFinal.json", JSON.stringify(summayTotal, null, 4));
    process.exit(1);
})();
