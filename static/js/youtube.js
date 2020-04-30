// Global var that has the information about the video
var youtubeVideoId = 'BPkZ7xr7qJ0';
var input = document.getElementById("input");
var output = document.getElementById("output");
var hostname = window.location.hostname;
var port = window.location.port;
var websocket_protocol = "wss"
var nextVideos = [];
var master = false;

var roomId = 'main';
var roomName = "Main room"

var allRooms = [{
    id: roomId,
    name: roomName
}, {
    id: 'rockhall',
    name: 'The Rock Hall'
}, {
    id: 'garage',
    name: 'The Punk Garage'
}, {
    id: 'zion',
    name: 'Zion meadow'
}, {
    id: 'electro',
    name: 'The Electro Warehouse'
}];

function setTagNumberOfTracks() {
    document.getElementById('numberOfTracksNext').innerHTML = `<span class="tag is-light">${nextVideos.length} track(s) playing next</span>`;
}


// Handle local dev cases
if (port.includes('80')) {
    websocket_protocol = "ws"
}

var socket = new WebSocket(websocket_protocol + "://" + hostname + ":" + port + "/echo");

socket.onopen = function () {
    document.getElementById('output').innerHTML += "<p>Status: Connected</p>";
};

socket.onmessage = function (e) {
    if (e.data.includes('YouAreMaster')) {
        master = true;
        document.getElementById('output').innerHTML += "You are now the master";
        if (document.getElementById('keepPreviousPlaylistCheckbox').checked) {
            document.getElementById('output').innerHTML += "Keeping playlist";
        } else {
            document.getElementById('output').innerHTML += "Resetting playlist";
            nextVideos = [];
        }
        document.getElementById('masterStatus').innerHTML = `<span class="tag is-info is-medium">You are the DJ</span>`;
        setTagNumberOfTracks();
    }
    if (e.data.includes('YouAreNotMaster')) {
        master = false;
        document.getElementById('output').innerHTML += "You are now NOT the master";
        document.getElementById('masterStatus').innerHTML = `
        <button class="button is-warning" onclick="requestMaster()">
            Ask to DJ
        </button>
        <label class="checkbox">
            <input type="checkbox" id="keepPreviousPlaylistCheckbox">
            Keep playlist from previous DJ
        </label>
        `;
        document.getElementById('masterRequest').innerHTML = ``;
        // Get playlist in case it was reset by new master
        socket.send('readonlyGetPlayerState');
        socket.send('readonlyGetPlayerState');
    }
    if (e.data.includes('ClientIsRequestingMaster')) {
        document.getElementById('output').innerHTML += "Someone is requesting master";
        document.getElementById('masterRequest').innerHTML = `
        <button onclick="socket.send('masterAccepted')" class="button is-warning">Accept request to give back the spot</button>
        `;
    }
    if (e.data.includes('readonlyGetPlayerState')) {
        var playerState = `{"nextVideos": ${JSON.stringify(nextVideos)},"playVideoId": "${youtubeVideoId}","playTime": "${player.getCurrentTime()}", "roomId": "${roomId}"}`;
        socket.send(playerState);
    }
    if (e.data.includes('nextVideos')) {
        document.getElementById('output').innerHTML += "here is next videos data" + e.data + "\n";
        obj = JSON.parse(e.data);
        if (obj.roomId !== roomId) {return;}
        nextVideos = obj.nextVideos;
        setTagNumberOfTracks();
    }
    if (e.data.includes('playVideoId')) {
        obj = JSON.parse(e.data);
        console.log("I'm in " + roomId + " and this is for " + obj.roomId)
        if (obj.roomId !== roomId) {return;}
        
        document.getElementById('output').innerHTML += "This is the json with video id: " + obj.playVideoId + " \n";
        if (obj.playVideoId == youtubeVideoId) {
            document.getElementById('output').innerHTML += "Nothing to do as the video playing is the same than video received\n";
        }
        else {
            if (e.data.includes('playTime')) {
                document.getElementById('output').innerHTML += "Going to play at a specific time\n";
                changeVideo(obj.playVideoId, Number(obj.playTime))
            } else {
                changeVideo(obj.playVideoId);
            }
            
        }
    }
    if (e.data.includes('playerState')) {
        // Handles changes in player state
        obj = JSON.parse(e.data);
        if (obj.roomId !== roomId) {return;}
        if (obj.playerState == YT.PlayerState.PLAYING) {
            player.playVideo();
        }
        if (obj.playerState == YT.PlayerState.PAUSED) {
            player.pauseVideo();
        }
        if (obj.playerState == -1) {
            player.playVideo();
        }
        if (obj.playerState == YT.PlayerState.ENDED) {
            if (nextVideos.length >= 1) {
                changeVideo(nextVideos.shift());
                setTagNumberOfTracks();
            }
            else {
                // Stay ended I guess
            }
        }
    }
    if (e.data.includes('cueVideoId')) {
        obj = JSON.parse(e.data);
        if (obj.roomId !== roomId) {return;}
        document.getElementById('output').innerHTML += "Cue req with id: " + obj.cueVideoId + " \n";
        nextVideos.push(obj.cueVideoId);
        setTagNumberOfTracks();
    }

    if (e.data.includes('chat')) {
        obj = JSON.parse(e.data);

        if (obj.roomId !== roomId) {return;}

        var text = obj.chatText;
        var name = obj.clientName;
        if (name == "") {
            name = 'Get a name dude';
        }
        var currentDate = new Date();
        var hourMinutes = `<p style="font-size:11px"><em>[${currentDate.getUTCHours()}:${currentDate.getUTCMinutes()}]</em></p>`;
        var previousChatContent = document.getElementById('chatroom').innerHTML;
        document.getElementById('chatroom').innerHTML = `${hourMinutes}<p style="font-size:13px"><em><strong>${name}</strong></em> - ${obj.chatText}</p>` + previousChatContent;
    }

    if (e.data.includes('rooms')) {
        obj = JSON.parse(e.data);
        allRooms = obj;
        refreshRooms(obj);
    }

    refreshRooms(allRooms);

    document.getElementById('output').innerHTML += "<p>Server: " + e.data + "</p>";
};

function requestMaster() {
    var requestBody = `{"masterRequest": "true", "roomId": "${roomId}"}`;
    socket.send(requestBody)
}

function sendNewVideoId(id) {
    var videoIdSocketMsg = `{"playVideoId": "${id}", "roomId": "${roomId}"}`;
    socket.send(videoIdSocketMsg);
}

function cueNewVideoId(id) {
    var videoIdSocketMsg = `{"cueVideoId": "${id}", "roomId": "${roomId}"}`;
    socket.send(videoIdSocketMsg);
}

function changeVideo(videoToPlay, playTime = 0) {
    youtubeVideoId = videoToPlay
    socket.send('{"videoId": "' + youtubeVideoId + '", "roomId": "${roomId}"}');
    document.getElementById('output').innerHTML += `Time  ${playTime}\n`;
    player.loadVideoById(youtubeVideoId, playTime);
    player.playVideo();
}


// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
var youtubeId;
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '330',
        width: '550',
        videoId: youtubeVideoId,
        events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
        }
    });
    socket.send('{"videoId": "' + youtubeVideoId + '", "roomId": "${roomId}"}');
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
    // socket.send('readyToPlay')
    // readonly requests are addressed to the master to know basic information like
    // playlist info, current video
    socket.send('readonlyGetPlayerState');
    // event.target.playVideo();
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
function onPlayerStateChange(event) {
    socket.send('{"playerState": ' + event.data + '}')
}

// Your use of the YouTube API must comply with the Terms of Service:
// https://developers.google.com/youtube/terms
// Called automatically when JavaScript client library is loaded.
function onClientLoad() {
    gapi.client.load('youtube', 'v3', onYouTubeApiLoad);
}
// Called automatically when YouTube API interface is loaded (see line 9).
function onYouTubeApiLoad() {
    gapi.client.setApiKey('AIzaSyCeV93ONxiwmUY7R05wh2ZmDjpHYFw0OAg');
}

// Called when the search button is clicked in the html code
function search() {
    var query = document.getElementById('query').value;
    // Use the JavaScript client library to create a search.list() API call.
    var request = gapi.client.youtube.search.list({
        part: 'snippet',
        q:query,
        maxResults:8
    });
    // Send the request to the API server, call the onSearchResponse function when the data is returned
    request.execute(onSearchResponse);
    document.getElementById('query').value = "";
}
// Triggered by this line: request.execute(onSearchResponse);
function onSearchResponse(response) {
    document.getElementById('response').innerHTML = '';
    var responseString = JSON.stringify(response, '', 2);
    results = response.items;
    console.log(results);
    for(var i = 0; i < results.length; i++) {
        var result = results[i];
        // result.id.videoId
        document.getElementById('response').innerHTML += `
        <tr>
            <td style="font-size:14px">${result.snippet.title}</td>
            <td><button onclick="sendNewVideoId('${result.id.videoId}')" class="button is-danger is-small">Play</button></td>
            <td><button onclick="cueNewVideoId('${result.id.videoId}')" class="button is-info is-small">Cue</button></td>
        </tr>
        `;
        
    }
}


function refreshRooms(results) {
    if (!results) {
        results = allRooms;
    }
    document.getElementById('rooms').innerHTML = '';
    console.log(results);
    for(var i = 0; i < results.length; i++) {
        var result = results[i];
        // result.id
        document.getElementById('rooms').innerHTML += `
        <tr>
            <td style="font-size:14px">${result.name}</td>
            <td><button onclick="changeRoom('${result.id}', '${result.name}')" class="button is-danger is-small">Join</button></td>
        </tr>
        `;
    }
}

function changeRoom(id, name) {
    roomId = id;
    roomName = name;
    document.getElementById("roomName").innerHTML = 'You are in the ' + roomName;
    document.getElementById('chatroom').innerHTML = 'Switched to a new room'
    socket.send('readonlyGetPlayerState');
}


// Chatroom part
function sendChatText() {
    var chatText = document.getElementById('chatText').value;
    if (chatText != "" ) {
        var name = document.getElementById('clientName').value;
        var payload = `{"chatText": "${chatText}", "clientName": "${name}", "roomId": "${roomId}"}`;
        socket.send(payload);
        document.getElementById('chatText').value = "";
    }
}

setTimeout(function init() {
    refreshRooms(allRooms);
    changeRoom(roomId, roomName);
}, 1000);
