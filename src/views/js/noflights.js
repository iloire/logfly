var {ipcRenderer} = require('electron')
const L = require('leaflet')
var i18n = require('../../lang/gettext.js')()
var Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
var Store = require('electron-store')
const elemMap = require('../../utils/leaflet/littlemap-build.js')
var store = new Store()
let menuFill = require('../../views/tpl/sidebar.js')
let btnMenu = document.getElementById('toggleMenu')
const btnFullmap = document.getElementById('fullmap')
let btnFlyxc = document.getElementById('flyxc')

let currLang
let mapPm
let track
let currIgcText

iniForm()

function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile));
            let langjson = JSON.parse(content);
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang);
        }
      } catch (error) {
          log.error('[problem.js] Error while loading the language file')
      }  
    let menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        var template = $(templates).filter('#temp-menu').html();  
        var rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    document.getElementById('tx_1').innerHTML = i18n.gettext('There are no flights in the logbook')
    document.getElementById('tx_2').innerHTML = i18n.gettext('Use the import option to fill the logbook')
    document.getElementById('tx_3').innerHTML = i18n.gettext('You can play with this demo track around the Mont Blanc') 
    igcDisplay()
}

// Calls up the relevant page 
function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName);    // main.js
}

btnMenu.addEventListener('click', (event) => {
    if (btnMenu.innerHTML === "Menu On") {
        btnMenu.innerHTML = "Menu Off";
    } else {
        btnMenu.innerHTML = "Menu On";
    }
    $('#sidebar').toggleClass('active');
})

btnFullmap.addEventListener('click', (event) => {  
    if (track !== undefined)  {
      if (track.fixes.length> 0) {    
        // functionnal code
        displayWait()
        let disp_map = ipcRenderer.send('display-map', track)   // process-main/maps/fullmap-display.js
      } else {
        log.error('Full map not displayed -> track decoding error  '+track.info.parsingError)
        let err_title = i18n.gettext("Program error")
        let err_content = i18n.gettext("Decoding problem in track file")
        ipcRenderer.send('error-dialog',[err_title, err_content])    // process-main/system/messages.js
      } 
    }     
  })  

  btnFlyxc.addEventListener('click', (event) => { 
    displayFlyxc()
  })


function igcDisplay() {
    let demoPath = './ext_resources/demo.igc'
    currIgcText = fs.readFileSync(demoPath, 'utf8')    
    try {
      track = ipcRenderer.sendSync('read-igc', currIgcText)  // process-main/igc/igc-read.js.js
      if (track.fixes.length> 0) {
        mapIgc(track)
      } else {
        displayStatus(track.info.parsingError)
      }        
    } catch (error) {
      displayStatus('Error '+' : '+error)      
    }      
  }

  function mapIgc(track) {
    const mapTrack = elemMap.buildElements(track)
    if (mapPm != null) {
      mapPm.off();
      mapPm.remove();
    }
    mapPm = L.map('mapid').setView([0, 0], 5)
    const osmlayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    const OpenTopoMap = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 16,
        attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    });
    var ignlayer = L.tileLayer('https://wxs.ign.fr/{ignApiKey}/geoportail/wmts?'+
    '&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&TILEMATRIXSET=PM'+
    '&LAYER={ignLayer}&STYLE={style}&FORMAT={format}'+
    '&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}',
    {
      ignApiKey: 'pratique',
      ignLayer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
      style: 'normal',
      format: 'image/png',
      service: 'WMTS',
    });
    let mtklayer = L.tileLayer('http://tile2.maptoolkit.net/terrain/{z}/{x}/{y}.png');
    let fouryoulayer = L.tileLayer('http://4umaps.eu/{z}/{x}/{y}.png');
    const baseMaps = {
      "OSM": osmlayer,
      "OpenTopo" : OpenTopoMap,
      "IGN" : ignlayer,
      "MTK" : mtklayer,
      "4UMaps" : fouryoulayer,
    };
    
    L.control.layers(baseMaps).addTo(mapPm)
    osmlayer.addTo(mapPm)   // default is osm

    const geojsonLayer = L.geoJson(mapTrack.trackjson,{ style: mapTrack.trackOptions}).addTo(mapPm)
    mapPm.fitBounds(geojsonLayer.getBounds());

    const StartIcon = new L.Icon(mapTrack.startIcon)
    const startLatlng = L.latLng(mapTrack.startLatlng.lat,mapTrack.startLatlng.long)
    L.marker(startLatlng,{icon: StartIcon}).addTo(mapPm);

    const EndIcon = new L.Icon(mapTrack.endIcon)
    const endLatlng = L.latLng(mapTrack.endLatlng.lat,mapTrack.endLatlng.long)
    L.marker(endLatlng,{icon: EndIcon}).addTo(mapPm);

    const info = L.control({position: 'bottomright'});

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'map-info'); // create a div with a class "map-info"
        this.update();
        return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    info.update = function () {
        this._div.innerHTML = '';
        this._div.innerHTML += mapTrack.flDate+'<br>'
        this._div.innerHTML += mapTrack.infoGlider
        this._div.innerHTML += mapTrack.maxAlti
        this._div.innerHTML += mapTrack.maxVario
    };

    info.addTo(mapPm);  

  }

  function displayFlyxc() {
    if (track !== undefined && track.fixes.length> 0) {  
      let resUpload = ipcRenderer.sendSync('upload-igc', currIgcText)  // process-main/igc/igc-read.js.js
      if (resUpload == null) {
        displayStatus('Download failed')
        log.error('[displayFlyxc] Download failed')
      } else {
        if (resUpload.includes('OK')) {
          // response is OK:20220711135317_882.igc
          let igcUrl = resUpload.replace( /^\D+/g, ''); // replace all leading non-digits with nothing
     //     store.set('igcVisu',igcUrl)
          let disp_flyxc = ipcRenderer.send('display-flyxc', igcUrl)   // process-main/maps/flyxc-display.js
        } else {
          log.error('[displayFlyxc] '+resUpload)
          displayStatus(resUpload)
        }
      }
    }
  }

  function displayStatus(content) {
    document.getElementById('status').innerHTML = i18n.gettext(content)
    $('#status').show(); 
  }

  function displayWait() {
    $('#div_text').removeClass('d-block')
    $('#div_text').addClass('d-none')
    $('#div_waiting').addClass('d-block')
  }

  ipcRenderer.on('remove-waiting-gif', (event, result) => {
    $('#div_waiting').removeClass('d-block')
    $('#div_waiting').addClass('d-none')
    $('#div_text').addClass('d-block')
  })