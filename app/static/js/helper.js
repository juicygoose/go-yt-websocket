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