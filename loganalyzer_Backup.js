/*import { readFiles, writeResponseintoScreen, displayResult } from './utils.js';*/

async function analyzeLog() {
    const folderInput = document.getElementById('folder-input');
    const files = folderInput.files;

    if (!files.length) {
    alert('Please select a folder containing log files.');
    return;
    }

    const logData = await readFiles(files);
    const logStats = analyzeLogData(logData);

    displayResult(logStats);
}

function analyzeWpeFramework(logData) {
    const logEntries = logData.trim().split('\n');
    var ThunderCallLines = logEntries.filter(line =>line.includes('ThunderService: CALL:'));
    var ThunderResponseLines = logEntries.filter(line => line.includes('ThunderService: RESPONSE'));
    const sortedlines = sortLogData(ThunderCallLines);
    var OrderedThunderCallLines = sortedlines.split('\n');
    const matchedPairs = ThunderCallLines.map(callLine => {
        const callId = callLine.match(/callId":(\d+)/)[1];
        const method = callLine.match(/"method":"([^"]+)"/)[1];
        const Plugin = callLine.match(/"plugin":"([^"]+)"/)[1];
        const responseLine = ThunderResponseLines.find(responseLine => responseLine.includes(`callId":${callId}`));
        let ResponseTimeMs = null;
        if(responseLine) {
            const match = responseLine.match(/\((\d+(\.\d+)?)ms\)/);
            if (match) {
                ResponseTimeMs = parseFloat(match[1]);
            }
        }

        return { call: callLine, response: responseLine, responsetime: ResponseTimeMs, method: method, plugin: Plugin };
      });
    if(ThunderCallLines.length && ThunderResponseLines.length){
      displayMatchedPairs(matchedPairs);
    }
    const WpeFrameworkresultHTML = `
    <h2>WPEFramework Analysis Results:</h2>
    <p>ThunderCalls: ${ThunderCallLines.length}</p>
    <p>ThunderResponse: ${ThunderResponseLines.length}</p>
    `;
    document.getElementById('WpeFrameworkresult').innerHTML = WpeFrameworkresultHTML;
}

function analyzeCrashed(logData) {
  const logEntries = logData.trim().split('\n');
  var Crashed_modules = logEntries.filter(line =>line.includes('process crashed ='));
  Crashed_modules.forEach(pair => {
    Display_info(pair);
  });
}

function analyzeAppServiced(logData){
  const logEntries = logData.split('\n');
  //var appsserviced_logs = logEntries.filter(line =>line.includes('appsserviced[')&& line.includes("loaded:"));
  var appsserviced_logs = logEntries.filter(line =>line.includes('appsserviced['));
  appsserviced_logs.forEach(pair => {
    Display_info(pair);
  });
}

function analyzeAppServiceProxy(logData) {
  const logEntries = logData.trim().split('\n');
  var ProxyRequestRecieved = logEntries.filter(line =>line.includes('HTTP Request received. httpRequestHandle:'));
  var ProxyResponseSent = logEntries.filter(line => line.includes('HTTP response sent.    httpRequestHandle:'));
  const sortedlines = sortLogData(ProxyRequestRecieved);
  var OrederedProxyRequestRecieved = sortedlines.split('\n');
  const matchedPairs = ProxyRequestRecieved.map(callLine => {
      const RequestHandle = callLine.match(/httpRequestHandle:\s*(\d+)/)[1];
      const Port = callLine.match(/Port:\s*(\d+)/)[1];
      const URI = callLine.match(/URI:\s*([^\s,]+)/)[1];
      const responseLine = ProxyResponseSent.find(responseLine => responseLine.includes(`httpRequestHandle: ${RequestHandle}`));
      let Status = null;
      let ResponseTimeMs = null;
      if(responseLine) {
        const RequestTimeStamp = splitDateTimeSingleEntry(callLine);
        const ResponseTimeStamp = splitDateTimeSingleEntry(responseLine);
        Status = responseLine.match(/httpStatus:\s*(\d+)/)[1];
        ResponseTimeMs = getDiffFromTimestamp(RequestTimeStamp, ResponseTimeStamp);
      }

      return { Request: callLine, response: responseLine, responsetime: ResponseTimeMs, Status: Status, Port: Port, URI: URI };
    });
  if(ProxyRequestRecieved.length && ProxyResponseSent.length){
    displayAppserviceProxyRequestResponseGraph(matchedPairs); 
  }
}

function analyzeKeyManager(logData){
  const logEntries = logData.trim().split('\n');
  var captureKey = logEntries.filter(line =>line.includes('KeyManagerTV_KeyManager: captureKey:'));
  var handleKey = logEntries.filter(line => line.includes('KeyManagerTV_KeyManager: handleKey:'));
  var releaseKey = logEntries.filter(line => line.includes('KeyManagerTV_KeyManager: captureKeyRelease:'));
  const matchedPairs = captureKey.map(Keyinput => {
      const KeyEventRecieved = Keyinput.match(/captureKey:\s*(\w+),(\d+)/)[1];
      const handleKeyLine = handleKey.find(handleKeyLine => handleKeyLine.includes(`handleKey: ${KeyEventRecieved}`));
      const releaseKeyLine = releaseKey.find(releaseKeyLine => releaseKeyLine.includes(`captureKeyRelease: ${KeyEventRecieved}`));

      return { CaptureKeyLine: Keyinput, handleKeyLine: handleKeyLine, releaseKeyLine: releaseKeyLine };
    });
}

function analyzeLogData(logData) {
    const lines = logData.split('\n');
    analyzeWpeFramework(logData);
    analyzeCrashed(logData);
    analyzeAppServiced(logData);
    analyzeAppServiceProxy(logData);
    analyzeKeyManager(logData);

    const logCount = lines.length;
    const wordCount = logData.split(/\s+/).length;

    return {
    totalLogs: logCount,
    totalWords: wordCount,
    averageWordsPerLog: wordCount / logCount
    };
}

function displayAppserviceProxyRequestResponseGraph(matchedPairs){
  let Status = [];
  const times = [];
  const URI = [];
  const barColors = [];
  matchedPairs.forEach(pair => {
    if(!pair.response){
      Display_info('UnresponsiveRequest: ' + pair.Request);
    }
    if(pair.responsetime){
      Status.push(pair.Status);
      times.push(pair.responsetime);
      URI.push(pair.URI);
      if(pair.responsetime > 1000){
        barColors.push('red');
      }else{
        barColors.push('green');
      }
    }
  });
  displayBarChart({
    chartId:"AppserviceProxyChart",
    titleData:"AppserviceProxy Requests and Response", 
    xAxesLableString:"URI", 
    methods:URI,
    times:times,
    plugins:Status,
    barColors:barColors});
}

function displayMatchedPairs(matchedPairs) {
    const methods = [];
    const times = [];
    const plugins = [];
    const barColors = [];
    matchedPairs.forEach(pair => {
      if(!pair.responseLine) {
        Display_info('UnresponsiveCALL: ' +pair.call);
      }
      if(pair.responsetime){
        methods.push(pair.method);
        times.push(pair.responsetime);
        plugins.push(pair.plugin);
        if(pair.responsetime > 1000){
            barColors.push('red');
        }
        else{
            barColors.push('green');
        }
    }
    });

    displayBarChart({
      chartId:"WpeFrameworkChart",
      titleData:"Thunder Requests and Response", 
      xAxesLableString:"Method", 
      methods:methods,
      times:times,
      plugins:plugins,
      barColors:barColors});
}

function displayBarChart(options){
  const {
    chartId,
    titleData,
    xAxesLableString,
    methods,
    times,
    plugins,
    barColors
  } = options;
  
  new Chart(chartId, {
    type: "bar",
    data: {
        labels: methods,
        datasets: [{
        backgroundColor: barColors,
        data: times,
        additionalInfo: plugins
        }]
    },
    options: {
        tooltips: {
            callbacks: {
              label: function(tooltipItem, data) {
                const dataset = data.datasets[tooltipItem.datasetIndex];
                const pluginInfo = dataset.additionalInfo[tooltipItem.index];
                return `Response Time: ${tooltipItem.yLabel} ms, Plugin Info: ${pluginInfo}`;
              }
            }
          },
          legend: {display: false},
          title: {
            display: true,
            text: titleData
          },
          scales: {
              xAxes: [{
                scaleLabel: {
                  display: true,
                  labelString: xAxesLableString
                }
              }],
              yAxes: [{
                scaleLabel: {
                  display: true,
                  labelString: "Response Time (ms)"
                }
             }]         
          }
      }
  });
}

function Display_info(pair){
  const pairsContainer = document.getElementById('container');
  const pairDiv = document.createElement('div');
  pairDiv.classList.add('pair');
  const callPara = document.createElement('p');
  callPara.textContent = pair;
  pairDiv.appendChild(callPara);
  pairsContainer.appendChild(pairDiv);
  }

function splitDateTime(logEntries){
  const parsedLogs = logEntries.map(logEntry => {
    return splitDateTimeSingleEntry(logEntry);
  });
  return parsedLogs;
}

function splitDateTimeSingleEntry(logEntry){
  parts = logEntry.split(' ');
  const [year, month, day, time, ...logContent] = parts;
  const [hour, minute, secondAndMicroSeconds] = time.split(':');
  const [second, MicroSeconds] = secondAndMicroSeconds.split('.');
  return { year, month, day, hour, minute, second, MicroSeconds, log: logContent.join(' ') };
}

function sortLogData(logEntries){
  const splitedDateTime = splitDateTime(logEntries);
  const parsedLogs = splitedDateTime.map(logEntryForm => {
  const dateTime = new Date(logEntryForm.year, parseMonth(logEntryForm.month), logEntryForm.day, logEntryForm.hour, logEntryForm.minute, logEntryForm.second, logEntryForm.MicroSeconds);
  return dateTime;
});
  const sortedLogs = parsedLogs.sort((a, b) => a.dateTime - b.dateTime);
  const sortedLogData = sortedLogs.map(log => `${new Date(log.dateTime).toLocaleString()} ${log.log}`).join('\n');

  return sortedLogData;
}


function getDiffFromTimestamp(RequestTimeStamp, ResponseTimeStamp){
  let ResponseTimeMs = null;
  if(parseFloat(RequestTimeStamp.year) == parseFloat(ResponseTimeStamp.year)){
    if(parseMonth(RequestTimeStamp.month) == parseMonth(ResponseTimeStamp.month)){
      if(parseFloat(RequestTimeStamp.day) == parseFloat(ResponseTimeStamp.day)){
        ResponseTimeMs = getHourDiffernce(RequestTimeStamp,ResponseTimeStamp);
        ResponseTimeMs += getMinutesDiffernce(RequestTimeStamp,ResponseTimeStamp);
        ResponseTimeMs += getSecondsDiffernce(RequestTimeStamp,ResponseTimeStamp);
        ResponseTimeMs += getMilliSecondsDiffernce(RequestTimeStamp,ResponseTimeStamp);
      }
    }      
  }
  return ResponseTimeMs;
}

function getHourDiffernce(RequestTimeStamp, ResponseTimeStamp){
  let ResponseTimeMs;
  let requestHour = parseFloat(RequestTimeStamp.hour);
  let responseHour = parseFloat(ResponseTimeStamp.hour); 
  if( requestHour == responseHour){
    ResponseTimeMs = 0;
  }
  else if (responseHour < requestHour) {
    ResponseTimeMs = responseHour + 24 - requestHour;
  }
  else{
    ResponseTimeMs = responseHour-requestHour;
  }
  ResponseTimeMs = ResponseTimeMs*60*60*1000;
  return ResponseTimeMs;
}

function getMinutesDiffernce(RequestTimeStamp, ResponseTimeStamp){
  let ResponseTimeMs;
  let requestMinute = parseFloat(RequestTimeStamp.minute);
  let responseMinute = parseFloat(ResponseTimeStamp.minute); 
  if( requestMinute == responseMinute){
    ResponseTimeMs = 0;
  }else if (responseMinute < requestMinute) {
    ResponseTimeMs = responseMinute + 60 - requestMinute;
  }else{
    ResponseTimeMs = responseMinute - requestMinute;
  }
  ResponseTimeMs = ResponseTimeMs*60*1000;
  return ResponseTimeMs;
}

function getSecondsDiffernce(RequestTimeStamp, ResponseTimeStamp){
  let ResponseTimeMs;
  let requestSeconds = parseFloat(RequestTimeStamp.second);
  let responseSeconds = parseFloat(ResponseTimeStamp.second); 
  if( requestSeconds == responseSeconds){
    ResponseTimeMs = 0;
  } else if(responseSeconds < requestSeconds){
    ResponseTimeMs = responseSeconds + 60 - requestSeconds;
  }else{
    ResponseTimeMs = responseSeconds-requestSeconds;
  }
  ResponseTimeMs = ResponseTimeMs*1000;
  return ResponseTimeMs;
}

function getMilliSecondsDiffernce(RequestTimeStamp, ResponseTimeStamp){
  let ResponseTimeMs;
  let requestMicroseconds = parseFloat(RequestTimeStamp.MicroSeconds);
  let responseMicroseconds =  parseFloat(ResponseTimeStamp.MicroSeconds);
  if(requestMicroseconds == responseMicroseconds){
    ResponseTimeMs = 0;
  } else if(responseMicroseconds < requestMicroseconds){
    ResponseTimeMs = responseMicroseconds + 1000 - requestMicroseconds; 
  }else{
    ResponseTimeMs = responseMicroseconds-requestMicroseconds;
  }
  ResponseTimeMs = ResponseTimeMs/1000;
  return ResponseTimeMs;
}
/*utils.js*/

async function readFiles(files) {
  let logData = '';
  for (const file of files) {
  const fileContent = await file.text();
  logData += fileContent;
  }
  return logData;
}

function writeResponseintoScreen(pair){
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

function displayResult(logStats) {
  const resultHTML = `
  <h2>Log Analysis Results:</h2>
  <p>Total Logs: ${logStats.totalLogs}</p>
  <p>Total Words: ${logStats.totalWords}</p>
  <p>Average Words per Log: ${logStats.averageWordsPerLog.toFixed(2)}</p>
  `;
  document.getElementById('result').innerHTML = resultHTML;
}

const monthNames = {
  'Jan': 0,
  'Feb': 1,
  'Mar': 2,
  'Apr': 3,
  'May': 4,
  'Jun': 5,
  'Jul': 6,
  'Aug': 7,
  'Sep': 8,
  'Oct': 9,
  'Nov': 10,
  'Dec': 11
};

function parseMonth(monthName) {
  return monthNames[monthName];
}