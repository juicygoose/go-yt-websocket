// Global var that has the information about the video
var youtubeVideoId = 'BPkZ7xr7qJ0';
var input = document.getElementById("input");
var output = document.getElementById("output");
var hostname = window.location.hostname;
var port = window.location.port;
var url = window.location.pathname.replace('/', '').replace('/', '');
var websocket_protocol = "wss"
var http_protocol = "https"
var nextVideos = [];
var master = false;
var suggestions = [];
var sentvote = false;
var upvote = 0;
var downvote = 0;
var guestList = [];
const uid = Math.floor(100000 + Math.random() * 900000);

function setTagNumberOfTracks() {
    document.getElementById('numberOfTracksNext').innerHTML = `<span class="tag is-light">${nextVideos.length} track(s) playing next</span>`;
    document.getElementById('tracksInPlaylist').innerHTML = `${nextVideos.length}`;
}


// Handle local dev cases
if (port.includes('80')) {
    websocket_protocol = "ws"
    http_protocol = "http"
}

var websocketUrl = `${websocket_protocol}://${hostname}:${port}/${url}-websocket`;
var socket = new WebSocket(websocketUrl);

socket.onopen = function () {
    document.getElementById('output').innerHTML += "<p>Status: Connected</p>";
};

socket.onmessage = function (e) {
    var obj = JSON.parse(e.data);
    if (obj.YouAreMaster) {
        master = true;
        if (document.getElementById('keepPreviousPlaylistCheckbox').checked) {
            document.getElementById('output').innerHTML += "Keeping playlist";
        } else {
            document.getElementById('output').innerHTML += "Resetting playlist";
            nextVideos = [];
        }
        document.getElementById('masterStatus').innerHTML = `<span class="tag is-info is-medium">You are the DJ</span>`;
        setTagNumberOfTracks();
        refreshCue();
        var masterId = {
            "masterId": uid
            }
        addChatText("bot", "You are now in charge 👑")
        socket.send(JSON.stringify(masterId));
    }
    if (obj.YouAreNotMaster) {
        master = false;
        document.getElementById('masterStatus').innerHTML = `
        <button class="button is-warning" onclick="requestMaster()">
            Ask to DJ
        </button>
        <label class="checkbox">
            <input type="checkbox" id="keepPreviousPlaylistCheckbox">
            Keep playlist from previous DJ
        </label>
        `;
        // Get playlist in case it was reset by new master
        socket.send(JSON.stringify({readonlyGetPlayerState: true}));
    }
    if (obj.ClientIsRequestingMaster) {
        addChatText("bot", `Someone is requesting to DJ!
        <button class="button is-warning is-outlined is-fullwidth is-small" onclick="socket.send(JSON.stringify({'masterAccepted': true}))">
            Accept
        </button>`);
    }
    if (obj.readonlyGetPlayerState) {
        var playerState = {
            "nextVideos": nextVideos,
            "playVideoId": youtubeVideoId,
            "playTime": player.getCurrentTime(),
            "upvote": upvote,
            "downvote": downvote,
            "guestList": guestList,
            "masterId": uid
        };
        socket.send(JSON.stringify(playerState));
    }
    if (obj.readonlySuggestedVideoId) {
        if (master) {
            suggestions.push(obj);
            refreshSuggestions();
        }
    }
    if (obj.nextVideos) {
        document.getElementById('output').innerHTML += "here is next videos data" + e.data + "\n";
        nextVideos = obj.nextVideos;
        setTagNumberOfTracks();
        refreshCue();
    }
    if (obj.playVideoId) {
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
        if (obj.upvote || obj.downvote) {
            upvote = obj.upvote;
            updateUpvote();
            downvote = obj.downvote;
            updateDownvote();
        }
    }
    if (obj.playerState || obj.playerState == 0) {
        // Handles changes in player state
        // Playing
        if (obj.playerState == 1) {
            player.playVideo();
        }
        // Paused
        if (obj.playerState == 2) {
            player.pauseVideo();
        }
        // Unstarted
        if (obj.playerState == -1) {
            player.playVideo();
        }
        // Player ended
        if (obj.playerState == 0) {
            if (nextVideos.length >= 1) {
                changeVideo(nextVideos.shift().cueVideoId);
                refreshCue();
                setTagNumberOfTracks();
            }
            else {
                // Stay ended I guess
            }
        }
    }
    if (obj.cueVideoId) {
        if (obj.remove == false) {
            document.getElementById('output').innerHTML += "Cue req with id: " + obj.cueVideoId + " \n";
            nextVideos.push(obj);
            console.log(nextVideos)
            removeSuggestion(obj.cueVideoId);
            refreshCue();
            setTagNumberOfTracks();
        } else {
            removeFromCue(obj.cueVideoId);
            setTagNumberOfTracks();
        }
    }
    if (obj.chatText) {
        text = obj.chatText;
        name = obj.clientName;
        var newMessage;
        if (name == "") {
            name = 'Get a name dude';
        }
        if (obj.uid == uid) {
            addChatText("", obj.chatText);
        } else {
            addChatText(name, obj.chatText)
        }
    }
    if (obj.vote) {
        if (sentvote) {
            sentvote = false;
        } else {
            if (obj.vote == 'up') {
                upvote++;
                updateUpvote(upvote);
            } else {
                downvote++;
                updateDownvote(downvote);
            }
        }
    }
    if (obj.ClientsConnected) {
        document.getElementById('clientsConnected').innerHTML = `${obj.ClientsConnected} guy(s) connected`;
        if (obj.leavingClientUid && obj.leavingClientUid > 0) {
            guestList = guestList.filter(function removeGuestById(guest) {
                return guest.uid !== obj.leavingClientUid
            });
        }
        refreshGuestList();
    }
    if (obj.newGuestInfo) {
        guestList.push({"name": obj.name, "uid": obj.uid});
        refreshGuestList();
    }
    if (obj.guestList) {
        guestList = obj.guestList;
    }
    if (obj.masterId && obj.masterId > 0) {
        guestList.forEach(function setMaster(guest) {
            if (obj.masterId > 0 && obj.masterId == guest.uid) {
                guest.isMaster = true;
            } else {
                guest.isMaster = false;
            }
        });
        refreshGuestList();
    }

    document.getElementById('output').innerHTML += "<p>Server: " + e.data + "</p>";
};

function addChatText(name, message) {
    var newMessage;
    if (name == "bot") {
        newMessage = `<li class="bot">${message}</li>`;
    }
    else if (name != "") {
        newMessage = `<li class="him"><em><strong>${name}</strong></em> <br/> ${message}</li>`;
    } else {
        newMessage = `<li class="me">${message}</li>`;
    }
    document.getElementById('chatroom').innerHTML += newMessage;
    document.getElementById('chatroom').scrollTo(0, document.getElementById('chatroom').scrollHeight);
}

function refreshGuestList() {
    if (document.getElementById('social-panel-attendees')) {
        document.getElementById('social-panel-attendees').innerHTML = '';
        guestList.forEach(function displayGuest(obj) {
            if (obj.isMaster) {
                document.getElementById('social-panel-attendees').innerHTML += `
                <a class="panel-block is-active">
                    <span class="panel-icon">
                        <i class="fas fa-music" aria-hidden="true"></i>
                    </span>
                    ${obj.name}
                </a>
                `;
            } else {
                document.getElementById('social-panel-attendees').innerHTML += `
                <a class="panel-block">
                    <span class="panel-icon">
                        <i class="far fa-user" aria-hidden="true"></i>
                    </span>
                    ${obj.name}
                </a>
                `;
            }
        });
    }
}

function requestMaster() {
    socket.send(JSON.stringify({'masterRequest': true}));
    addChatText("bot", "Request sent to the DJ 👌🏼")
}

function sendNewVideoId(id) {
    var videoIdSocketMsg = {"playVideoId": id};
    socket.send(JSON.stringify(videoIdSocketMsg));
    removeSuggestion(id);
}

function cueNewVideoId(id, title, remove = false) {
    var videoIdSocketMsg = {"cueVideoId": id, "cueVideoTitle": title, "remove": remove};
    socket.send(JSON.stringify(videoIdSocketMsg));
}

function changeVideo(videoToPlay, playTime = 0) {
    youtubeVideoId = videoToPlay
    socket.send('{"videoId": "' + youtubeVideoId + '"}');
    document.getElementById('output').innerHTML += `Time  ${playTime}\n`;
    player.loadVideoById(youtubeVideoId, playTime);
    player.playVideo();

    // Gather in one method post-change
    removeSuggestion(youtubeVideoId);
    document.getElementById('upvote').removeAttribute('disabled');
    document.getElementById('downvote').removeAttribute('disabled');
    upvote = 0;
    downvote = 0;
    updateUpvote();
    updateDownvote();
}

function updateUpvote() {
    document.getElementById('upvote').innerHTML = 'Yeaah 🎉 ' + upvote;
}

function updateDownvote() {
    document.getElementById('downvote').innerHTML = downvote + ' ☠️ Bweerk';
}

function suggestVideoId(id, title) {
    var videoIdSocketMsg = {
        "readonlySuggestedVideoId": id,
        "title": title
    };
    socket.send(JSON.stringify(videoIdSocketMsg));
    var htmlId = 'reco-' + id;
    document.getElementById(htmlId).classList.add("is-success");
    document.getElementById(htmlId).setAttribute('disabled', 'disabled');
    document.getElementById(htmlId).innerHTML = 'Sent to DJ';
}

function refreshSuggestions() {    
    document.getElementById('suggestions').innerHTML = '';
    suggestions.forEach(function displaySuggestion(obj) {
        document.getElementById('suggestions').innerHTML += newVideoRow(obj.readonlySuggestedVideoId, obj.title);
    });
    document.getElementById('tracksInReco').innerHTML = `${suggestions.length}`;
}

function refreshCue() {
    document.getElementById('playlist-table').innerHTML = '';
    nextVideos.forEach(function displayCue(obj) {
        document.getElementById('playlist-table').innerHTML += newVideoInPlaylist(obj.cueVideoId, obj.cueVideoTitle);
    })
}

function removeSuggestion(id) {
    suggestions = suggestions.filter(function removeSuggestionById(sugg) {
        return sugg.readonlySuggestedVideoId !== id
    });
    refreshSuggestions();
}

function removeFromCue(id) {
    nextVideos = nextVideos.filter(function removeCueById(cue) {
        return cue.cueVideoId !== id
    });
    refreshCue();
}

function clearReco() {
    suggestions = [];
    refreshSuggestions();
}

function triggerVote(vote) {
    var voteMsg = {
        "social": true,
        "vote": vote
    };
    sentvote = true;
    socket.send(JSON.stringify(voteMsg));
    if (vote == 'up') {
        upvote++;
        updateUpvote();
    } else {
        downvote++;
        updateDownvote();
    }

    document.getElementById('upvote').setAttribute('disabled', 'disabled');
    document.getElementById('downvote').setAttribute('disabled', 'disabled');
}

function newVideoRow(id, title) {
    return `
    <tr>
        <td style="font-size:14px">${title}</td>
        <td><button onclick="sendNewVideoId('${id}')" class="button is-success is-small is-rounded">Play</button></td>
        <td><button onclick="cueNewVideoId('${id}', '${title}')" class="button is-info is-small is-rounded">Cue</button></td>
    </tr>`;
}

function newVideoInPlaylist(id, title) {
    return `
    <tr>
        <td style="font-size:14px">${title}</td>
        <td><button onclick="cueNewVideoId('${id}', '${title}', true)" class="button is-danger is-small is-rounded">Remove</button></td>
    </tr>`;
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

// Called when the search button is clicked in the html code
function search(event) {
    if (event.which == 13 || event.keyCode == 13) {
        var query = document.getElementById('query').value;
        var formattedSearchQuery = query.replace(new RegExp(' ', 'g'), '+');
    
        var url = `${http_protocol}://${hostname}:${port}/search-video?search_query=${formattedSearchQuery}&max_results=6`;
        var request = new XMLHttpRequest();
        request.open('GET', url, true)
        request.onload = function() {
            var data = JSON.parse(this.response)
            if (request.status >= 200 && request.status < 400) {
                onSearchResponse(data)
            } else {
                console.log('Error searching videos')
            }
        }
        request.send()
        document.getElementById('query').value = "";
    }
}

function onSearchResponse(response) {
    document.getElementById('response').innerHTML = '';
    var responseString = JSON.stringify(response, '', 2);
    results = response.Items;
    
    for(var i = 0; i < results.length; i++) {
        var result = results[i];
        if (master) {
            document.getElementById('response').innerHTML += newVideoRow(result.ID, result.Title)
        } else {
            document.getElementById('response').innerHTML += `
            <tr>
                <td style="font-size:14px">${result.Title}</td>
                <td><button onclick="suggestVideoId('${result.ID}', '${result.Title}')" class="button is-info is-small is-rounded" id="reco-${result.ID}">Send reco</button></td>
            </tr>
            `;
        }

        
    }
}

// Chatroom part
function sendChatText(event) {
    if (event.which == 13 || event.keyCode == 13) {
        var chatText = document.getElementById('chatText').value;
        if (chatText != "" ) {
            var name = document.getElementById('clientName').value;
            var payload = {
                "social": true,
                "chatText": chatText,
                "clientName": name,
                "uid": uid
            };
            socket.send(JSON.stringify(payload));
            document.getElementById('chatText').value = "";
        }
    }
}
