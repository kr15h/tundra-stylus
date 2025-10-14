# SteamVR OpenVR middleware

This middleware uses Python OpenVR bindings to extract tracking data from SteamVR and publish them via WebSocket API.

## Dependencies

- Python 3.6
- pyopenvr
- websocketd

## Installing Dependencies

OpenVR pyopenvr requires Python 3.5+. We will be installing Python 3.6. To make the installation of a specific Python version easier, we will be using [Git Bash](https://git-scm.com/downloads) and [pyenv-win](https://github.com/pyenv-win/pyenv-win). 

### 1. Install Git Bash
First, install Git Bash.

### 2. Install pyenv-win
Then, install [pyenv-win](https://github.com/pyenv-win/pyenv-win/blob/master/docs/installation.md#git-commands) to manage multiple Python versions. This will make it easier to install a specific Python version. As for pyenv-win installation, I used Git Bash to install. Open Git Bash and use the following commands.
```
git clone https://github.com/pyenv-win/pyenv-win.git "$HOME\.pyenv"
echo 'export PATH="$HOME/.pyenv/pyenv-win/shims:$PATH"' >> ~/.bash_profile
echo 'export PATH="$HOME/.pyenv/pyenv-win/bin:$PATH"' >> ~/.bash_profile
```

Restart Git Bash and validate pyenv-win installation.
```
pyenv --version
```

The response should include `pyenv 3.1.1` or later version.

### 3. Install Python 3.6
Next, we want to install Python 3.6, even though [pypenvr](https://github.com/cmbruns/pyopenvr) requires Python 3.5+. To do that, we can list all available Python versions with newly installed `pyenv` and pick one that fits our taste best.
```
pyenv install -l
```

Looks like for `3.6` the `3.6.8` version is available. Let's proceed with that.
```
pyenv install 3.6.8
```

Now, you can of course choose (between local and global setting), I will set this version as global as the only reason I will be using Python on this machine is Tundra Stylus.
```
pyenv global 3.6.8
```

Finally, confirm that, indeed, Python version `3.6.8` is active.
```
$ python --version
Python 3.6.8
```

Also confirm that you have `pip` as we will need it to install `pyopenvr` shortly.
```
python -m pip install --upgrade pip
```

### 4. Install pyopenvr
Use the following command in Git Bash to install pyopenvr with Python pip.
```
pip install openvr
```

### 5. Install websocketd
Go to [websocketd website](http://websocketd.com) and download zip file. Extract `websocketd` to C:\Program Files\websocketd\. Next, the path needs to be added to PATH.

Open Advanced System Settings. Click on Environment Variables. Double-click on Path. Add path to `websocketd.exe` enclosing folder.
```
C:\Program Files\websocketd\
```

Restart Git Bash and validate.
```
websocketd
```

You should see the following output.
```
Command line arguments are missing.

Usage:

  Export a single executable program a WebSocket server:
    websocketd.exe [options] COMMAND [command args]

  Or, export an entire directory of executables as WebSocket endpoints:
    websocketd.exe [options] --dir=SOMEDIR

  Or, show extended help message using:
    websocketd.exe --help
```

## Usage

Make sure you start SteamVR and that the Tundra Tracker attached to the stylus is detected. The following will make the websocket server available at `ws://localhost:8080/`.

```
websocketd --address=localhost --port=8080 python mw-openvr.py
```

If you want to debug, you probably would like to enable verbose output.

```
python mw-openvr.py -v
```

You can also display help if you want.

```
python mw-openvr.py -h
```
