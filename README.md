# Simple app to enjoy listening songs with other people

Websocket event design
```
{
    "videoId": "myvideoid",
    "playerState": "1",
    "videoCurrentTime": "240",
    "fromMaster": true,
    "requestSync": true,
    "requestMaster": true,
}
```


Communication from master to all clients is completely free and allowed
Communication from clients to master is restricted to master request and readonly messages 