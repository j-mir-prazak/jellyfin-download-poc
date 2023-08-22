import { playbackManager } from '../../components/playback/playbackmanager';
import serverNotifications from '../../scripts/serverNotifications';
import ServerConnections from '../../components/ServerConnections';
import { PluginType } from '../../types/plugin';
import Events from '../../utils/events';


function getActivePlayerId() {
    const info = playbackManager.getPlayerInfo();
    return info ? info.id : null;
}

function getPlayer() {
    const player = playbackManager.getCurrentPlayer();
    return player ? player : null;
}


function fakeDownloadButton() {
    var template = `
    <button id="downloadButton" is="paper-icon-button-light" class="btnVideoOsdDownloadautoSize paper-icon-button-light" title="Download">
    <span class="largePaperIconButton material-icons download" aria-hidden="true"></span>
    </button>
    `

    var div = document.createElement('div')
    div.innerHTML = template.trim()

    var button = div.firstChild
    button.addEventListener("click", clickHandler )

    return button
}

function findQualityButton() {
    var quality = document.getElementsByClassName('btnVideoOsdSettings')[0]
    return quality
}

function findDownloadButton() {
    var download = document.getElementById('downloadButton')
    return download
}

function insertDownloadButton() {

    var d = fakeDownloadButton()
    if ( ! d ) return 'no element'

    var q = findQualityButton()
    return q.parentNode.insertBefore( d, q.nextSibling )

}

async function clickHandler() {

    var player = getPlayer()
    console.log(player)

    var url         = player.streamInfo.url
    var title       = player.streamInfo.title
    var playMethod  = player.streamInfo.playMethod
    var mimetype    = player.streamInfo.mimetype

    var downloadRequest = {
        title: title,
        playMethod: playMethod,
        url: url
    }

    var string = JSON.stringify( downloadRequest )
    var base = btoa( string )

    window.open( "https://jellygrab.yaos.space/#" + base, "jellyfinDownload", "popup=true") 

}


class DownloadButton {
    constructor() {
        const self = this;

        this.name = 'Download Button';
        this.type = PluginType.MediaPlayer;
        this.isLocalPlayer = false;
        this.id = ' downloadButton';

        window.getPlayer = getPlayer
        window.insertDownloadButton = insertDownloadButton
        
        var buttoner = setInterval(() => {
            try {
                if ( findDownloadButton()  || insertDownloadButton() ) {
                    clearInterval( buttoner)
                }
            }
            catch(e){}

        }, 2500)
    }
}

export default DownloadButton;
