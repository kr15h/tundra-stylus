# Web UI

Web UI for testing Tundra Stylus with different proxies. All proxies send data according to the same protocol. 

## Dependencies

- Python [http.server](https://docs.python.org/3/library/http.server.html)

## Usage

```
python -m http.server --bind localhost 8000
```

This will launch a webserver at `http://localhost:8000/`.