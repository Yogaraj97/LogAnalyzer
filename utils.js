/*export async function readFiles(files) {
    let logData = '';
    for (const file of files) {
    const fileContent = await file.text();
    logData += fileContent;
    }
    return logData;
}

export function writeResponseintoScreen(pair){
    const pairsContainer = document.getElementById('container');
    const pairDiv = document.createElement('div');
    pairDiv.classList.add('pair');

    const callPara = document.createElement('p');
    callPara.textContent = 'CALL: ' + pair.call;

    const responsePara = document.createElement('p');
    responsePara.textContent = 'RESPONSE: ' + pair.response;

    const TimeTakenPara = document.createElement('p');
    TimeTakenPara.textContent = 'Time: ' +pair.responsetime;

    const MethodPara = document.createElement('p');
    MethodPara.textContent = 'Method: ' +pair.method;

    const PluginPara = document.createElement('p');
    PluginPara.textContent = 'plugin: ' +pair.plugin;

    pairDiv.appendChild(callPara);
    pairDiv.appendChild(responsePara);
    pairDiv.appendChild(TimeTakenPara);
    pairDiv.appendChild(MethodPara);
    pairDiv.appendChild(PluginPara);

    pairsContainer.appendChild(pairDiv);

}

export function displayResult(logStats) {
    const resultHTML = `
    <h2>Log Analysis Results:</h2>
    <p>Total Logs: ${logStats.totalLogs}</p>
    <p>Total Words: ${logStats.totalWords}</p>
    <p>Average Words per Log: ${logStats.averageWordsPerLog.toFixed(2)}</p>
    `;
    document.getElementById('result').innerHTML = resultHTML;
}*/

