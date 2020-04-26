// Global var that has the information about the video
var youtubeVideoId = 'BPkZ7xr7qJ0';
var input = document.getElementById("input");
var output = document.getElementById("output");
var hostname = window.location.hostname
var port = window.location.port
var websocket_protocol = "wss"
var nextVideos = []

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
    socket.send('readonlyGetNextVideos');
};

socket.onmessage = function (e) {
    if (e.data.includes('YouAreMaster')) {
        document.getElementById('output').innerHTML += "You are now the master";
        if (document.getElementById('keepPreviousPlaylistCheckbox').checked) {
            document.getElementById('output').innerHTML += "Keeping playlist";
        } else {
            document.getElementById('output').innerHTML += "Resetting playlist";
            nextVideos = [];
        }
        document.getElementById('masterStatus').innerHTML = `<span class="tag is-info is-medium">You are the master</span>`;
        setTagNumberOfTracks();
    }
    if (e.data.includes('YouAreNotMaster')) {
        document.getElementById('output').innerHTML += "You are now NOT the master";
        document.getElementById('masterStatus').innerHTML = `
        <button class="button is-warning" onclick="requestMaster()">
            Request master
        </button>
        <label class="checkbox">
            <input type="checkbox" id="keepPreviousPlaylistCheckbox">
            Keep playlist from previous master
        </label>
        `;
        document.getElementById('masterRequest').innerHTML = ``;
        // Get playlist in case it was reset by new master
        socket.send('readonlyGetNextVideos');
    }
    if (e.data.includes('ClientIsRequestingMaster')) {
        document.getElementById('output').innerHTML += "Someone is requesting master";
        document.getElementById('masterRequest').innerHTML = `
        <button onclick="socket.send('masterAccepted')" class="button is-warning">Accept client request to transfer master</button>
        `;
    }
    if (e.data.includes('readonlyGetNextVideos')) {
        var nextVideosMsg = `{"nextVideos": ${JSON.stringify(nextVideos)}}`;
        socket.send(nextVideosMsg);
    }
    if (e.data.includes('nextVideos')) {
        obj = JSON.parse(e.data);
        nextVideos = obj.nextVideos;
        setTagNumberOfTracks();
    }
    if (e.data.includes('playVideoId')) {
        obj = JSON.parse(e.data);
        
        document.getElementById('output').innerHTML += "This is the json with video id: " + obj.playVideoId + " \n";
        if (obj.playVideoId == youtubeVideoId) {
            document.getElementById('output').innerHTML += "Nothing to do as the video playing is the same than video received\n";
        }
        else {
            youtubeVideoId = obj.playVideoId;
            changeVideo(youtubeVideoId);
        }
    }
    else if (e.data.includes('playerState')) {
        // Handles changes in player state
        obj = JSON.parse(e.data);
        if (obj.playerState == YT.PlayerState.PLAYING) {
            player.playVideo();
        }
        if (obj.playerState == YT.PlayerState.PAUSED) {
            player.pauseVideo();
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
    else if (e.data.includes('cueVideoId')) {
        obj = JSON.parse(e.data);
        document.getElementById('output').innerHTML += "Cue req with id: " + obj.cueVideoId + " \n";
        nextVideos.push(obj.cueVideoId);
        setTagNumberOfTracks();
    }

    document.getElementById('output').innerHTML += "<p>Server: " + e.data + "</p>";
};

function requestMaster() {
    socket.send('masterRequest')
}

function sendNewVideoId(id) {
    var videoIdSocketMsg = `{"playVideoId": "${id}"}`;
    socket.send(videoIdSocketMsg);
}

function cueNewVideoId(id) {
    var videoIdSocketMsg = `{"cueVideoId": "${id}"}`;
    socket.send(videoIdSocketMsg);
}

function changeVideo(youtubeVideoId) {
    socket.send('{"videoId": "' + youtubeVideoId + '"}')
    player.loadVideoById(youtubeVideoId);
    player.playVideo()
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
    socket.send('{"videoId": "' + youtubeVideoId + '"}');
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
    // socket.send('readyToPlay')
    event.target.playVideo();
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
        maxResults:6
    });
    // Send the request to the API server, call the onSearchResponse function when the data is returned
    request.execute(onSearchResponse);
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
            <td>${result.snippet.title}</td>
            <td><button onclick="sendNewVideoId('${result.id.videoId}')" class="button is-danger is-small">Play</button></td>
            <td><button onclick="cueNewVideoId('${result.id.videoId}')" class="button is-info is-small">Cue</button></td>
        </tr>
        `;
        
    }
}
