// Global var that has the information about the video
var youtubeVideoId = 'BPkZ7xr7qJ0';
var input = document.getElementById("input");
var output = document.getElementById("output");
var hostname = window.location.hostname;
var port = window.location.port;
var url = window.location.pathname.replace('/', '').replace('/', '');
var websocket_protocol = "wss"
var nextVideos = [];
var master = false;

var suggestions = [];

function setTagNumberOfTracks() {
    document.getElementById('numberOfTracksNext').innerHTML = `<span class="tag is-light">${nextVideos.length} track(s) playing next</span>`;
}


// Handle local dev cases
if (port.includes('80')) {
    websocket_protocol = "ws"
}

var websocketUrl = `${websocket_protocol}://${hostname}:${port}/${url}-websocket`;
var socket = new WebSocket(websocketUrl);

socket.onopen = function () {
    document.getElementById('output').innerHTML += "<p>Status: Connected</p>";
};

socket.onmessage = function (e) {
    console.dir(e.data);
    var obj = JSON.parse(e.data);
    if (obj.YouAreMaster) {
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
        refreshQueue();
    }
    if (obj.YouAreNotMaster) {
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
        socket.send(JSON.stringify({readonlyGetPlayerState: true}));
        refreshQueue();
    }
    if (obj.ClientIsRequestingMaster) {
        document.getElementById('output').innerHTML += "Someone is requesting master";
        document.getElementById('masterRequest').innerHTML = `
        <button onclick="socket.send(JSON.stringify({'masterAccepted': true}))" class="button is-warning">Accept request to give back the spot</button>
        `;
    }
    if (obj.readonlyGetPlayerState) {
        var playerState = {
            "nextVideos": nextVideos,
            "playVideoId": youtubeVideoId,
            "playTime": player.getCurrentTime()
        };
        socket.send(JSON.stringify(playerState));
    }
    if (obj.nextVideos) {
        document.getElementById('output').innerHTML += "here is next videos data" + e.data + "\n";
        obj = JSON.parse(e.data);
        nextVideos = obj.nextVideos;
        setTagNumberOfTracks();
        refreshQueue();
    }
    if (obj.playVideoId) {
        obj = JSON.parse(e.data);
        
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
    if (obj.suggestedVideoId) {
        suggestions.push(obj);
        refreshSuggestions();
    }
    if (obj.playerState) {
        // Handles changes in player state
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
                changeVideo(nextVideos.shift().cueVideoId);
                setTagNumberOfTracks();
                refreshQueue();
            }
            else {
                // Stay ended I guess
            }
        }
    }
    if (obj.cueVideoId) {
        document.getElementById('output').innerHTML += "Cue req with id: " + obj.cueVideoId + " \n";
        nextVideos.push(obj);
        setTagNumberOfTracks();
        refreshQueue();
    }

    if (obj.chatText) {
        text = obj.chatText;
        name = obj.clientName;
        if (name == "") {
            name = 'Get a name dude';
        }
        var currentDate = new Date();
        var hourMinutes = `<p style="font-size:11px"><em>[${currentDate.getUTCHours()}:${currentDate.getUTCMinutes()}]</em></p>`;
        var previousChatContent = document.getElementById('chatroom').innerHTML;
        document.getElementById('chatroom').innerHTML = `${hourMinutes}<p style="font-size:13px"><em><strong>${name}</strong></em> - ${obj.chatText}</p>` + previousChatContent;
    }

    document.getElementById('output').innerHTML += "<p>Server: " + e.data + "</p>";
};

function requestMaster() {
    socket.send(JSON.stringify({'masterRequest': true}));
}

function sendNewVideoId(id) {
    var videoIdSocketMsg = {"playVideoId": id};
    socket.send(JSON.stringify(videoIdSocketMsg));

    removeSuggestion(id);
}

function refreshSuggestions() {
    document.getElementById('suggestions').innerHTML = '';
    suggestions.forEach(function displaySuggestion(obj) {
        if (master) {
            document.getElementById('suggestions').innerHTML += `
                <tr>
                    <td style="font-size:14px">${obj.title}</td>
                    <td><button onclick="sendNewVideoId('${obj.suggestedVideoId}')" class="button is-danger is-small is-rounded">Play</button></td>
                    <td><button onclick="cueNewVideoId('${obj.suggestedVideoId}')" class="button is-info is-small is-rounded">Cue</button></td>
                </tr>
            `;
        } else {
            document.getElementById('suggestions').innerHTML += `
                <tr>
                    <td style="font-size:14px">${obj.title}</td>
                </tr>
            `;
        }
    });
}

function refreshQueue() {
    console.dir(nextVideos);
    document.getElementById('queue').innerHTML = '';
    if (master) {
        nextVideos.forEach(function displayQueuedSong(obj) {
            document.getElementById('queue').innerHTML += `
            <tr>
                <td style="font-size:14px">${obj.cueVideoTitle}</td>
                <td><button onclick="removeFromQueue('${obj.cueVideoTitle}')" class="button is-info is-small is-rounded">Remove</button></td>
            </tr>
            `;
        });
    }
}

function removeFromQueue(videoTitle) {
    nextVideos = nextVideos.filter(function filterTitle(song) {
        return song.cueVideoTitle !== videoTitle;
    })
    refreshQueue();
}

function suggestVideoId(id, title) {
    var videoIdSocketMsg = {
        "suggestedVideoId": id,
        "title": title
    };
    socket.send(JSON.stringify(videoIdSocketMsg));
}

function cueNewVideoId(id, title) {
    var videoIdSocketMsg = {"cueVideoId": id, "cueVideoTitle": title};
    socket.send(JSON.stringify(videoIdSocketMsg));

    removeSuggestion(id);
}

function changeVideo(videoToPlay, playTime = 0) {
    youtubeVideoId = videoToPlay
    socket.send('{"videoId": "' + youtubeVideoId + '"}');
    document.getElementById('output').innerHTML += `Time  ${playTime}\n`;
    player.loadVideoById(youtubeVideoId, playTime);
    player.playVideo();

    removeSuggestion(youtubeVideoId);
}

function removeSuggestion(id) {
    suggestions = suggestions.filter(function removeSuggestionById(sugg) {
        return sugg.suggestedVideoId !== id
    });
    refreshSuggestions();
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
    // readonly requests are addressed to the master to know basic information like
    // playlist info, current video
    socket.send(JSON.stringify({'readonlyGetPlayerState': true}));
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
    includeHTML();
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

        if (master) {
            document.getElementById('response').innerHTML += `
            <tr>
                <td style="font-size:14px">${result.snippet.title}</td>
                <td><button onclick="sendNewVideoId('${result.id.videoId}')" class="button is-danger is-small is-rounded">Play</button></td>
                <td><button onclick="cueNewVideoId('${result.id.videoId}', '${result.snippet.title}')" class="button is-info is-small is-rounded">Cue</button></td>
            </tr>
            `;
        } else {
            document.getElementById('response').innerHTML += `
            <tr>
                <td style="font-size:14px">${result.snippet.title}</td>
                <td><button onclick="suggestVideoId('${result.id.videoId}', '${result.snippet.title}')" class="button is-danger is-small is-rounded">Suggest</button></td>
            </tr>
            `;
        }
    }

}

// Chatroom part
function sendChatText() {
    var chatText = document.getElementById('chatText').value;
    if (chatText != "" ) {
        var name = document.getElementById('clientName').value;
        var payload = {
            "chatText": chatText,
            "clientName": name
        };
        socket.send(JSON.stringify(payload));
        document.getElementById('chatText').value = "";
    }
}

// https://www.w3schools.com/howto/howto_html_include.asp
function includeHTML() {
    var z, i, elmnt, file, xhttp;
    /* Loop through a collection of all HTML elements: */
    z = document.getElementsByTagName("*");
    for (i = 0; i < z.length; i++) {
        elmnt = z[i];
        /*search for elements with a certain atrribute:*/
        file = elmnt.getAttribute("include-html");
        if (file) {
            /* Make an HTTP request using the attribute value as the file name: */
            xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                console.log("onreadystatechange " + file)
                if (this.readyState == 4) {
                    console.log("onreadystatechange 4 " + file)
                    if (this.status == 200) {elmnt.innerHTML = this.responseText;}
                    if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
                    /* Remove the attribute, and call this function once more: */
                    elmnt.removeAttribute("include-html");
                    includeHTML();
                }
            }
            xhttp.open("GET", file, true);
            xhttp.send();
            /* Exit the function: */
            return;
        }
    }

    console.log("HTML loaded, calling onYouTubeIframeAPIReady")
    onYouTubeIframeAPIReady();
}
