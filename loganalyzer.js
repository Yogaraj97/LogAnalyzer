/*import { readFiles, writeResponseintoScreen, displayResult } from './utils.js';*/

function analyzeLog() {
    console.log("Analysis stated");
    const folderInput = document.getElementById('folder-input');
    const files = folderInput.files;
    if (!files.length) {
    alert('Please select a folder containing log files.');
    return;
    }
    const filesWithTimestamp = Array.from(files).map(file => ({
      fileObject: file,
      timestamp: file.lastModified
    }));

    filesWithTimestamp.sort((a, b) => a.timestamp - b.timestamp);

    analyzeLogData(filesWithTimestamp);
}

async function analyzeWpeFramework(files) {
    const wpeFrameworkFilteredFiles = Array.from(files).filter(file => {
      const fileName = file.fileObject.name;
      if(fileName.startsWith('wpeframework')){
        return fileName;
      }
    });
    const wpeFrameworklogData = await readFiles(wpeFrameworkFilteredFiles.map(entry => {return entry.fileObject}));
    const wpeFrameworklogEntries = wpeFrameworklogData.trim().split('\n');
    var ThunderCallLines = wpeFrameworklogEntries.filter(line =>line.includes('ThunderService: CALL:'));
    var ThunderResponseLines = wpeFrameworklogEntries.filter(line => line.includes('ThunderService: RESPONSE'));
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
    analyzeDeviceActivation(wpeFrameworklogEntries);
    analyzeKeyManager(wpeFrameworklogEntries);
    analyzeNetworkConnectivity(wpeFrameworklogEntries);
    analyzeWebprocessUnresponsive(wpeFrameworklogEntries);
    analyzePluginActivation(wpeFrameworklogEntries);

    const WpeFrameworkresultHTML = `
    <h2>WPEFramework Analysis Results:</h2>
    <p>ThunderCalls: ${ThunderCallLines.length}</p>
    <p>ThunderResponse: ${ThunderResponseLines.length}</p>
    `;
    document.getElementById('WpeFrameworkresult').innerHTML = WpeFrameworkresultHTML;
}

async function analyzeVersion(files) {
  const VersionFilteredFiles = Array.from(files).filter(file => {
    const fileName = file.fileObject.name;
    if(fileName.startsWith('version')){
      return fileName;
    }
  });

  const VersionlogData = await readFiles(VersionFilteredFiles.map(entry => {return entry.fileObject}));
  const VersionLogs = VersionlogData.trim().split('\n');
   const buildDetails = {};

  VersionLogs.forEach(line => {
    let [key, value] = line.split(/[:=]/);
    if (value?.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    buildDetails[key.trim()] = value?.trim() ?? '';
  });

  displayTitle('🛠️ Build Details');

  for (const [key, value] of Object.entries(buildDetails)) {
    displayBuildDetail(key, value);
  }
}

function displayBuildDetail(label, value) {
  const div = document.createElement('div');
  div.innerHTML = `<strong>${label}:</strong> ${value}`;
  document.body.appendChild(div);
}

async function analyzeCoreLogs(files) {
  const coreLogsFilteredFiles = Array.from(files).filter(file => {
    const fileName = file.fileObject.name;
    if(fileName.startsWith('core_log')){
      return fileName;
    }
  });
  const coreLogData = await readFiles(coreLogsFilteredFiles.map(entry => {return entry.fileObject}));
  const coreLogEntries = coreLogData.trim().split('\n');
  var Crashed_modules = coreLogEntries.filter(line =>line.includes('process crashed ='));
  Crashed_modules.forEach(pair => {
    Display_info(pair);
  });
  if(Crashed_modules.length==0){
    displayTitle('No crash observed with this logs');
  }
}

async function analyzeSkyMessages(files){
  const skyMessagesFilteredFiles = Array.from(files).filter(file => {
    const fileName = file.fileObject.name;
    if(fileName.startsWith('sky-messages')){
      return fileName;
    }
  });
  const skyMessageslogData = await readFiles(skyMessagesFilteredFiles.map(entry => {return entry.fileObject}));
  analyzeJourneySteps(skyMessageslogData);
  analyzeAppServiced(skyMessageslogData);
  analyzeAppServiceProxy(skyMessageslogData);
}

async function analyzeTopLogs(files){
  const topLogsFilteredFiles = Array.from(files).filter(file => {
    const fileName = file.fileObject.name;
    if(fileName.startsWith('top_log')){
      return fileName;
    }
  });
  const topLogData = await readFiles(topLogsFilteredFiles.map(entry => {return entry.fileObject}));
  const topLogEntries = topLogData.trim().split('\n');
  var topenteryCount = 0;
  const commandMap = new Map();

  for (const line of topLogEntries) {
    const parts = line.split(/\s+/);
    if (parts.length >= 17 && parts[16] === 'COMMAND'){ 
      topenteryCount++;
      continue;
    }
    const timestampStr = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;

    if (parts.length == 17) {
      const command = parts[16];
      const pid = parseFloat(parts[5]);

      if(commandMap.has(command)){
        const processMap = commandMap.get(command);
        if(processMap.has(pid)){
          const existingPidData = processMap.get(pid);
          existingPidData.cpuUsage.push(parseFloat(parts[13]));
          existingPidData.memUsage.push(parseFloat(parts[14]));
          existingPidData.timestamps.push(new Date(timestampStr));
        }
        else{
          processMap.set(pid, {
            cpuUsage: [parseFloat(parts[13])],
            memUsage: [parseFloat(parts[14])],
            timestamps: [new Date(timestampStr)]
          });
        }
      }else{
        const newProcessMap = new Map();
        newProcessMap.set(pid, {
          cpuUsage: [parseFloat(parts[13])],
          memUsage: [parseFloat(parts[14])],
          timestamps: [new Date(timestampStr)]
        });
        commandMap.set(command,newProcessMap);
      }
    }
  }
  if(topenteryCount > 3){
    displayTitle('CPU USAGE');
    for (const [command, processMap] of commandMap){
        processMap.forEach((value, key)=>{
          if(value.cpuUsage.length > 3){
            plotUsage(command+key,value.cpuUsage, value.timestamps, '%CPU');
          }
      })
    }
    
    displayTitle('MEMORY USAGE');
    for (const [command, processMap] of commandMap){
      processMap.forEach((value, key)=>{
        if(value.cpuUsage.length > 3){
          plotUsage(command+key,value.memUsage, value.timestamps, '%MEM');
        }
      })
    }
  analyzeUsedAndFreeMem(topLogEntries);
  }
  else{
    displayTitle('Not able to debug top logs it have below 3 entries');
  }
}

function analyzeUsedAndFreeMem(topLogEntries){
  var UsedMemoryLines = topLogEntries.filter(line =>line.includes('USED_MEM:'));
  const memeoryUsed = [];
  const  timeStamp = [];
  UsedMemoryLines.forEach(memeoryUsedLine => {
    const parts = memeoryUsedLine.split(/\s+/);
    const timestampStr = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
    const memeoryused = memeoryUsedLine.match(/USED_MEM:(\d+)/)[1];
    memeoryUsed.push(memeoryused);
    timeStamp.push(new Date(timestampStr));
  })
  displayTitle('OVERALL MemoryUsage');
  plotUsage('CumulativeMemoryUsage',memeoryUsed,timeStamp,'OverAllMem' );
}

async function analyzeSystemLogs(files) {
  const systemFilteredFiles = Array.from(files).filter(file => {
    const fileName = file.fileObject.name;
    if(fileName.startsWith('system')){
      return fileName;
    }
  });

  const systemlogData = await readFiles(systemFilteredFiles.map(entry => {return entry.fileObject}));
  const allLogs = systemlogData.trim().split('\n');;

  const parseLog = (line) => {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+systemd\[1\]:\s+(.*)$/);
    if (!match) return null;
    const timestamp = new Date(match[1]);
    const message = match[2].trim();
    return { timestamp, message };
  };

  const entries = allLogs.map(parseLog).filter(Boolean);

  const pendingStarts = new Map();
  const pendingMounts = new Map();
  const results = [];

  for (const { timestamp, message } of entries) {
    let key;

    if (message.startsWith('Starting ')) {
      key = message.replace(/^Starting\s+/, '').replace(/\.\.\.$/, '');
      pendingStarts.set(key, timestamp);
    } else if (message.startsWith('Started ')) {
      key = message.replace(/^Started\s+/, '').replace(/\.$/, '');
      if (pendingStarts.has(key)) {
        const startTime = pendingStarts.get(key);
        pendingStarts.delete(key);
        results.push({
          type: 'service',
          name: key,
          startTime,
          endTime: timestamp,
          durationMs: timestamp - startTime,
        });
      }
    } else if (message.startsWith('Mounting ')) {
      key = message.replace(/^Mounting\s+/, '').replace(/\.\.\.$/, '');
      pendingMounts.set(key, timestamp);
    } else if (message.startsWith('Mounted ')) {
      key = message.replace(/^Mounted\s+/, '').replace(/\.$/, '');
      if (pendingMounts.has(key)) {
        const mountTime = pendingMounts.get(key);
        pendingMounts.delete(key);
        results.push({
          type: 'mount',
          name: key,
          startTime: mountTime,
          endTime: timestamp,
          durationMs: timestamp - mountTime,
        });
      }
    }
  }

  // Add incomplete start entries
  for (const [name, time] of pendingStarts.entries()) {
    results.push({
      type: 'service',
      name,
      startTime: time,
      endTime: null,
      durationMs: null,
      status: 'incomplete',
    });
  }

  // Add incomplete mount entries (optional)
  for (const [name, time] of pendingMounts.entries()) {
    results.push({
      type: 'mount',
      name,
      startTime: time,
      endTime: null,
      durationMs: null,
      status: 'incomplete',
    });
  }
  displaySystemLogResults(results);
}

function displaySystemLogResults(results) {
  const completed = results.filter(r => r.endTime);
  const incomplete = results.filter(r => !r.endTime);

  // Display Completed Entries emoji ✅ get from emojipedia.org
  displayTitle('✅ Completed Services and Mounts');
  completed.forEach(entry => {
    const div = document.createElement('div');
    div.textContent = `${entry.type.toUpperCase()}: ${entry.name} | Duration: ${entry.durationMs} ms`;
    document.body.appendChild(div);
  });

  // Display Incomplete Entries 
  displayTitle('❌Incomplete Services and Mounts');
  incomplete.forEach(entry => {
    const div = document.createElement('div');
    div.textContent = `${entry.type.toUpperCase()}: ${entry.name} | Started at: ${entry.startTime.toISOString()}`;
    document.body.appendChild(div);
  });
}


function plotUsage(canvasId, Usage, timestamps, ylabelString){
  const container = document.createElement('div');
  container.className = 'chart-container';
  container.style.width = '550px'; 
  container.style.height = '300px';
  document.body.appendChild(container);

  const canvas = document.createElement('canvas');
  canvas.id = canvasId;
  canvas.width = 550;
  canvas.height = 300;
  canvas.style.border = '1px solid black';
  container.appendChild(canvas);
  
  const cpuCtx = canvas.getContext('2d');
  const cpuChart = new Chart(cpuCtx, {
      type: 'line',
      data: {
          labels: timestamps,
          datasets: [{
              label: canvas.id,
              data: Usage,
              borderColor: 'rgba(255, 99, 132, 1)',
              fill: false
          }]
      },
      options: {
          scales: {
              xAxes: [{
                  type: 'time',
                  time: {
                      unit: 'minute',
                      displayFormats: {
                          minute: 'HH:mm'
                      }
                  },
                  scaleLabel: {
                      display: true,
                      labelString: 'Time'
                  }
              }],
              yAxes: [{
                  scaleLabel: {
                      display: true,
                      labelString: ylabelString
                  }
              }]
          }
      }
  });
}

function analyzeAppServiced(skyMessageslogData){
  const skyMessageslogEntries = skyMessageslogData.trim().split('\n');
  //var appsserviced_logs = logEntries.filter(line =>line.includes('appsserviced[')&& line.includes("loaded:"));
  var appsserviced_logs = skyMessageslogEntries.filter(line =>line.includes('appsserviced['));
  appsserviced_logs.forEach(pair => {
    //Display_info(pair);
  });
}

function analyzeAppServiceProxy(skyMessageslogData) {
  const skyMessageslogEntries = skyMessageslogData.trim().split('\n');
  var ProxyRequestRecieved = skyMessageslogEntries.filter(line =>line.includes('HTTP Request received. httpRequestHandle:'));
  var ProxyResponseSent = skyMessageslogEntries.filter(line => line.includes('HTTP response sent.    httpRequestHandle:'));
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

function analyzeJourneySteps(skyMessageslogData){
  const skyMessageslogEntries = skyMessageslogData.trim().split('\n');
  const journeySteps = [];

  const regex = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+.*milestone:\s+ENTERING JOURNEY STEP\s+:\s+"([^"]+)"/;

  for (const line of skyMessageslogEntries) {
    const match = line.match(regex);
    if (match) {
      journeySteps.push({
        timestamp: new Date(match[1]),
        step: match[2]
      });
    }
  }
  if(journeySteps.length){
    displayTitle('🚀 Journey Steps');
    journeySteps.forEach(step => {
      const Data = document.createElement('p');
      Data.textContent = `🕒 ${step.timestamp.toISOString()} — ${step.step}`;
      document.body.appendChild(Data);
      }
    );

  }
  return journeySteps;
}

function analyzeKeyManager(wpeFrameworklogEntries){
  var captureKey = wpeFrameworklogEntries.filter(line =>line.includes('KeyManagerTV_KeyManager: captureKey:'));
  var handleKey = wpeFrameworklogEntries.filter(line => line.includes('KeyManagerTV_KeyManager: handleKey:'));
  var releaseKey = wpeFrameworklogEntries.filter(line => line.includes('KeyManagerTV_KeyManager: captureKeyRelease:'));
  const matchedPairs = captureKey.map(Keyinput => {
      const KeyEventRecieved = Keyinput.match(/captureKey:\s*(\w+),(\d+)/)[1];
      const handleKeyLine = handleKey.find(handleKeyLine => handleKeyLine.includes(`handleKey: ${KeyEventRecieved}`));
      const releaseKeyLine = releaseKey.find(releaseKeyLine => releaseKeyLine.includes(`captureKeyRelease: ${KeyEventRecieved}`));

      return { CaptureKeyLine: Keyinput, handleKeyLine: handleKeyLine, releaseKeyLine: releaseKeyLine };
    });

    matchedPairs.forEach(pair => {
      Display_info(pair.CaptureKeyLine);
      Display_info(pair.handleKeyLine);
      Display_info(pair.releaseKeyLine);
    });
}

function analyzeNetworkConnectivity(wpeFrameworklogEntries){
  var NetworkResponseCodeLine = wpeFrameworklogEntries.filter(line =>line.includes('checkInternetStateFromResponseCode:'));
  const networkConnectivity = [];
  const timeStamps = [];
  NetworkResponseCodeLine.forEach(connctivity => {
    const ConnectionStatus = connctivity.match(/Internet State:\s*(.+)/)[1];
    const parts = connctivity.split(/\s+/);
    if(ConnectionStatus.includes('FULLY_CONNECTED')){
      networkConnectivity.push(100);
    }else if(ConnectionStatus.includes('NO_INTERNET')){
      networkConnectivity.push(0);
    }
    const timestampStr = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
    timeStamps.push(new Date(timestampStr));
  })
  displayTitle('OVERALL NetworkUsage');
  plotUsage('CumulativeNetworkUsage',networkConnectivity,timeStamps,'OverAllNetworkConnectivity' );
}

function analyzeWebprocessUnresponsive(wpeFrameworklogEntries){
  const pattern = /pid=(\d+), reply num=(\d+)\(max=(\d+)\), url=(http[^\s]+)/;
  const results = [];
  for (const logLine of wpeFrameworklogEntries){
    const match = logLine.match(pattern);

    if (match) {
      results.push({
        pid: match[1],
        replyNum: match[2],
        max: match[3],
        url: match[4],
      });
    }
  }
  results.forEach(entry => {
    console.log(`PID: ${entry.pid}`);
    console.log(`Reply Num: ${entry.replyNum}`);
    console.log(`Max: ${entry.max}`);
    console.log(`URL: ${entry.url}`);
    console.log('---------------------------------');
  });
}

function analyzePluginActivation(wpeFrameworklogEntries){
  const activatingPattern = /Activating plugin \[([^\]]+)\]:\[(.*?)\]/;
  const activatedPattern = /Activated plugin \[([^\]]+)\]:\[(.*?)\]/;
  const activatingPlugins = [];
  const activatedPlugins = [];

  for (const logLine of wpeFrameworklogEntries){
    const activatingMatch = logLine.match(activatingPattern);
    const activatedMatch = logLine.match(activatedPattern);
    if (activatingMatch) {
      activatingPlugins.push({
        pluginName: activatingMatch[1],
        orgPath: activatingMatch[2],
      });
    }
    if (activatedMatch) {
      activatedPlugins.push({
        pluginName: activatedMatch[1],
        orgPath: activatedMatch[2],
      });
    }
  }
  
  // Find plugins that are activating but not activated
  let notActivated = activatingPlugins.filter(plugin => 
  !isPluginActivated(plugin, activatedPlugins) );

  if (notActivated.length > 0) {
    displayTitle('Plugins that were activating but not activated:');
    notActivated.forEach(plugin => {
      Display_info('Plugin Name: ' + plugin.pluginName + ', Org Path: ' + plugin.orgPath);
    });
  } else {
    displayTitle('All activating plugins were successfully activated.');
  }
}

// Helper function to check if a plugin exists in the activated list
function isPluginActivated(activatingPlugin, activatedPlugins) {
  return activatedPlugins.some(activatedPlugin => 
    activatedPlugin.pluginName === activatingPlugin.pluginName &&
    activatedPlugin.orgPath === activatingPlugin.orgPath
  );
}

function analyzeDeviceActivation(wpeFrameworklogEntries){
  const parsedLogs = [];

  const regex = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\S+\[\d+\]:\s+\[\d+\]\s+([DIWE]-\|)\s+\[([^\]:]+):(\d+)\]\s+([^(]+):\s*(.*)$/;

  for (const line of wpeFrameworklogEntries) {
    const match = line.match(regex);
    if (match) {
      parsedLogs.push({
        timestamp: new Date(match[1]),
        level: match[2],
        file: match[3],
        line: parseInt(match[4]),
        function: match[5].trim(),
        message: match[6].trim()
      });
    }
  }
  
  displayTitle('📋 DeviceProvisioning Logs');

  parsedLogs.forEach(entry => DisplayProvisioningInfo(entry));

  return parsedLogs;
}

function DisplayProvisioningInfo(entry) {
  const div = document.createElement('div');
  div.style.padding = '4px 0';
  div.innerHTML = `
    <strong>[${entry.level}]</strong> ${entry.timestamp.toISOString()} - 
    <em>${entry.file}:${entry.line}</em> 
    <strong>${entry.function}</strong> - 
    ${entry.message}
  `;
  document.body.appendChild(div);
}

function analyzeLogData(files) {
    analyzeVersion(files);
    analyzeWpeFramework(files);
    analyzeCoreLogs(files);
    analyzeSkyMessages(files);
    analyzeTopLogs(files);
    analyzeSystemLogs(files);
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

function splitDateTimeSingleEntry(logEntry) {
  const dateTimeEndIndex = logEntry.indexOf('Z') + 1;
  const dateTime = logEntry.slice(0, dateTimeEndIndex);
  const restOfLog = logEntry.slice(dateTimeEndIndex).trim();

  const [date, timeWithMs] = dateTime.split('T');
  const [time, msAndZone] = timeWithMs.split('.');
  const [hour, minute, second] = time.split(':');
  const millisecond = msAndZone.replace('Z', '');

  return {
    year: date.split('-')[0],
    month: date.split('-')[1],
    day: date.split('-')[2],
    hour,
    minute,
    second,
    millisecond,
    log: restOfLog
  };
}

function getDiffFromTimestamp(RequestTimeStamp, ResponseTimeStamp){
  let ResponseTimeMs = 0;
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
  let ResponseTimeMs =0;
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
  let ResponseTimeMs = 0;
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
  let ResponseTimeMs =0;
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
  let ResponseTimeMs = 0;
  let requestMiliseconds = parseFloat(RequestTimeStamp.millisecond);
  let responseMiliseconds =  parseFloat(ResponseTimeStamp.millisecond);
  if(requestMiliseconds == responseMiliseconds){
    ResponseTimeMs = 0;
  } else if(responseMiliseconds < requestMiliseconds){
    ResponseTimeMs = responseMiliseconds + 1000 - requestMiliseconds; 
  }else{
    ResponseTimeMs = responseMiliseconds-requestMiliseconds;
  }
  ResponseTimeMs = ResponseTimeMs/1000;
  return ResponseTimeMs;
}
/*utils.js*/

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

async function readFiles(fileObjects) {
  const fileContents = [];
  for (const fileObject of fileObjects) {
      const fileContent = await readFile(fileObject);
      fileContents.push(fileContent);
  }
  return fileContents.join('');
}

async function readFile(fileObject) {
  return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => { 
        resolve(reader.result)
      };
      reader.readAsText(fileObject);
  });
}

function displayTitle(textContent){
  const title = document.createElement('h2');
  title.textContent = textContent;
  document.body.appendChild(title);
}

