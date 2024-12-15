# Usage

## SteamVR

Launch the proxy script using websocketd. You will need to [install websocketd](http://websocketd.com/) first.

```
websocketd --address=localhost --port=8080 python proxy.py
```

This will launch a websocket server at `ws://localhost:8080/`.

## Web UI

You will need to launch a webserver locally. For instance, using python.

```
python -m http.server --bind localhost 8000
```

This will launch a webserver at `http://localhost:8000`.