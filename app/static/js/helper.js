var hostname = window.location.hostname;
var port = window.location.port;
var url = window.location.pathname.replace('/', '').replace('/', '');
var websocket_protocol = "wss"
var http_protocol = "https"

// Handle local dev cases
if (port.includes('80')) {
    websocket_protocol = "ws"
    http_protocol = "http"
}

function getConnectedClients() {
    var url = `${http_protocol}://${hostname}:${port}/rooms-stats`;
    var request = new XMLHttpRequest();
    request.open('GET', url, true)
    request.onload = function() {
        var data = JSON.parse(this.response)
        if (request.status >= 200 && request.status < 400) {
            for (var i = 0; i < data.length; i++) {
                document.getElementById('rooms-dropdown').innerHTML = formatNavbarItem(data[i].Name, data[i].NumberOfClients) + document.getElementById('rooms-dropdown').innerHTML;
            }
        } else {
            console.log('Error loading navbar')
        }
    }
    request.send()
}

function formatNavbarItem(name, clientsConnected) {
    return `<a class="navbar-item" onclick="javascript:window.location.href='/${name}/'">
                <span class="tag is-success is-light is-rounded" >${name}</span> <span class="tag is-info is-light is-rounded" >${clientsConnected} attending</span>
            </a>`;
}

var activeRecordShelfPanel = 'search';

function activatepanel(panelToActivate) {
    if (panelToActivate == activeRecordShelfPanel) {
        return
    }
    if (master || panelToActivate == 'search') {
        // Only master has access to recos and playlist
        document.getElementById('track-toolbox-' + activeRecordShelfPanel).setAttribute('style', 'display: none;')
        document.getElementById('track-toolbox-' + panelToActivate).removeAttribute('style');
        document.getElementById('panel-tab-' + activeRecordShelfPanel).classList.remove("is-active");
        document.getElementById('panel-tab-'+ panelToActivate).classList.add("is-active");
        activeRecordShelfPanel = panelToActivate;
    } else {
        toggleModal(true);
    }
}

function toggleModal(open = false) {
    if (open == true) {
        document.getElementById("modal").classList.add("is-active");
    } else {
        document.getElementById("modal").classList.remove("is-active");
    }
}

var activeSocialPanel = 'chat';

function activateSocialPanel(panelToActivate) {
    if (panelToActivate == activeSocialPanel) {
        return
    }
    document.getElementById('social-panel-' + activeSocialPanel).setAttribute('style', 'display: none;')
    document.getElementById('social-panel-' + panelToActivate).removeAttribute('style');
    document.getElementById('panel-tab-' + activeSocialPanel).classList.remove("is-active");
    document.getElementById('panel-tab-'+ panelToActivate).classList.add("is-active");
    activeSocialPanel = panelToActivate;
}

function enterKeyboard(event) {
    if (event.which == 13 || event.keyCode == 13) {
        enterRoom();
    }
}

function enterRoom() {
    var guestName = document.getElementById('guestName').value;
    if (guestName != "") {
        document.getElementById('clientName').value = guestName;
        document.getElementById('clientName').setAttribute('readonly', true);
        document.getElementById("nameInput").classList.remove("is-active");
        var newGuest = {
            "social": true,
            "newGuestInfo": true,
            "uid": uid,
            "name": guestName
        }
        socket.send(JSON.stringify(newGuest))
    }
}