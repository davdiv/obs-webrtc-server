# obs-webrtc-server

[![npm](https://img.shields.io/npm/v/obs-webrtc-server)](https://www.npmjs.com/package/obs-webrtc-server)

Web server allowing browsers connected to it to share their camera/microphone/screen, which are automatically added as sources in OBS Studio and can be recorded individually.

## Getting started

- Make sure you have [node.js](https://nodejs.org/en/download) installed.

- Make sure [OBS Studio](https://obsproject.com/) is installed with the [Browser source](https://obsproject.com/eu/kb/browser-source).

- Start OBS Studio

- In the `Tools` menu, click on `WebSocket Server settings`, and make sure the `Enable WebSocket Server` and `Enable Authentication` checkboxes are checked. Click on the `Show Connect info` button, and then copy the `Server password`.

- Start `obs-webrtc-server` with npx and paste the password when requested:

```bash
npx obs-webrtc-server
```

- A yaml configuration file is created and the password is saved in it. Feel free to adjust any of the [options](src/server/config.ts) in the configuration file.

- Next time `obs-webrtc-server` is started from the same folder, the configuration file will be reused and no password will be requested. Note that it is possible to specify the path to the configuration file as an argument (`npx obs-webrtc-server obs-webrtc-server.yaml`).

- Connect to the "Emitter URL" displayed on the console from each device which should share its camera/microphone/screen. When a device is connected, a corresponding scene is added in OBS Studio. It is also possible to manually add other scenes that combine the streams coming from multiple devices. When a device disconnects, the automatically added scene is removed.
