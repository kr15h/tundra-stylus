# Steam VR OpenVR proxy

This proxy uses Python OpenVR bindings to extract tracking data from SteamVR.

## Dependencies

- [SteamVR](https://store.steampowered.com/app/250820/SteamVR/) with null driver enabled
- [websocketd](http://websocketd.com/)
- [Python 3.6](https://www.python.org/) with [openvr](https://github.com/cmbruns/pyopenvr?tab=readme-ov-file)

## Usage

The following will make the websocket server available at `ws://localhost:8080/`.

```
websocketd --address=localhost --port=8080 python proxy.py
```

If you want to debug, you probably would like to enable verbose output.

```
python proxy.py -v
```

You can also display help if you want.

```
python proxy.py -h
```
