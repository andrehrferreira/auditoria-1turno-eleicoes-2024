/**
 * Crawler de BUs em binario e JSON do site do TSE
 * 
 * @autor Andre Ferreira <andrehrf@gmail.com>
 * @see https://resultados.tse.jus.br/oficial/app/index.html
 */

import * as puppeteer from 'puppeteer';
import * as path from "path";
import * as fs from "fs";
import * as cliProgress from "cli-progress";

process.on('uncaughtException', function(err) {
    console.log(err)
})

class CrawlerBUs{
    async createBrowser(){
        const describe = (jsHandle) => {
            console.log(jsHandle);
            return jsHandle.executionContext().evaluate((obj) => {
                return obj;
            }, jsHandle);
        }

        this.browser = await puppeteer.launch({
            headless: false,
            enableServiceWorkers: true,
            ignoreCSSErrors: true,
            ignoreJSErrors: true,
            ignoreRequestErrors: true,
            defaultViewport: null,
            ignoreHTTPSErrors: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--ignore-certificate-errors', 
                '--disable-web-security', 
                '--disable-features=site-per-process'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
        this.page.setViewport({width: 1920, height: 1024});
        this.page.setRequestInterception(false);
        this.page.on('console', async message => {
            try{
                const args = await Promise.all(message.args().map(async arg => await arg.jsonValue()));
    
                if(args[0]?.name == "entidadeBoletimUrna"){                    
                    const zona = args[0].identificacao.municipioZona.zona?.value;
                    const municipio = args[0].identificacao.municipioZona.municipio?.value;
                    const secao = args[0].identificacao.secao?.value;

                    if(!fs.existsSync(`./BUs/${municipio}`))
                        fs.mkdirSync(`./BUs/${municipio}`);

                    //if(!fs.existsSync(`./Screenshots/${municipio}`))
                    //    fs.mkdirSync(`./Screenshots/${municipio}`);

                    fs.writeFileSync(`./BUs/${municipio}/BU-${municipio}-${zona}-${secao}.json`, JSON.stringify(args[0]));
                    //await this.page.screenshot({path: `./Screenshots/${municipio}/BU-${municipio}-${zona}-${secao}.png`,  fullPage: true});
                    this.browser.close();
                }
            }
            catch(e){}
        })
        .on('pageerror', ({ message }) => console.log(message))
        .on('response', async response => {
            try{
                const url = response.url();
        
                if(response.url().includes('.bu')){
                    const filename = path.basename(url);
                    fs.writeFileSync(`./Binary/${filename}`, await response.buffer());
                }
            }
            catch(e){}
        })
        //.on('requestfailed', request => console.log(`${request.failure().errorText} ${request.url()}`));
    }

    async getPageData(url, metadata){
        try{
            const _metadata = metadata;
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36');

            await this.page.goto(url, { waitUntil: ["networkidle0", "domcontentloaded"] });

            await this.page.evaluate((_metadata) => {
                localStorage.setItem('CapacitorStorage.ultimaSelecao:oficial', `{"params":{"e":"e619","uf":"sp","ufbu":"sp","mubu":"${_metadata.municipio}","zn":"${_metadata.zona}","se":"${_metadata.secao}","tipo":"3"},"data":"${new Date().toISOString()}"}`);
                localStorage.setItem('_cap_ultimaSelecao:oficial', `{"params":{"e":"e619","uf":"sp","ufbu":"sp","mubu":"${_metadata.municipio}","zn":"${_metadata.zona}","se":"${_metadata.secao}"},"data":"${new Date().toISOString()}"}`);
                localStorage.setItem('_cap_ultimoFiltro:oficial', '{}');
            }, _metadata);

            await this.page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });

            setTimeout(() => this.browser.close(), 12000);
        }
        catch(e){
            //console.log(e)
        }
    }
}

(async () => {
    let crawlerIndex = (fs.existsSync("crawlerIndex.txt")) ? fs.readFileSync("crawlerIndex.txt", "utf-8") : 0;
    const urlListRaw = JSON.parse(fs.readFileSync('./linksBUs.json'));
    const urlList = urlListRaw.filter(item => item.uf === 'sp' && item.nubu === '71072');

    //try{ crawlerIndex = parseInt(crawlerIndex); }
    //catch(e){}

    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(urlList.length, 0);
    let promises = [];
    
    for(let keyUrl = 0; keyUrl < urlList.length; keyUrl+=2){
        try{
            //if(keyUrl > crawlerIndex){
                //await fs.writeFileSync('crawlerIndex.txt', keyUrl.toString());
                
                for(let key = 0; key < 2; key++){
                    bar1.increment();  
                    const link = decodeURIComponent(urlList[keyUrl].url);
                    const municipio = urlList[keyUrl].nubu;
                    const zona = urlList[keyUrl].zn;
                    const secao = urlList[keyUrl].se;
                    
                    if(
                        !fs.existsSync(`./BUs/${municipio}/BU-${municipio}-${zona}-${secao}.json`) &&
                        !fs.existsSync(`./BUs/${parseInt(municipio)}/BU-${parseInt(municipio)}-${parseInt(zona)}-${parseInt(secao)}.json`)
                    ){
                        //console.log(`BU-${municipio}-${zona}-${secao}.json`)

                        promises.push(new Promise(async (resolve) => {                                                  
                            const urlData = urlList[keyUrl + key];
                            //console.log(urlData.url);
                            const crawler = new CrawlerBUs();
                            await crawler.createBrowser();
                            await crawler.getPageData(link, {
                                municipio, zona, secao
                            });
                            resolve();
                        }));
                        /*const urlData = urlList[keyUrl];
                        const crawler = new CrawlerBUs();
                        await crawler.createBrowser();
                        await crawler.getPageData(link, {
                            municipio, zona, secao
                        });*/

                        //await new Promise((resolve) => setTimeout(() => resolve, 3000))
                    }
                }

                if(promises.length > 0)
                    await Promise.all(promises);

                promises = [];
            //}
        }
        catch(e){ 
            console.log(e); 
        }
    }
})();


function getDataByRegex(regex, str){
    let m;
    let result = [];

    while ((m = regex.exec(str)) !== null) {
        if (m.index === regex.lastIndex) 
            regex.lastIndex++;
            
        m.forEach((match, groupIndex) => {
            result[groupIndex] = match;
        });
    }

    return result
}