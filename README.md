# 3devo-gui

A replacement for the DevoVision application that comes with the 3devo desktop filament extruders.
Built with Tauri, React and Typescript in Vite.

## Installation

1. Download the latest release (`.exe` or `.msi) from the GitHub releases [here](https://github.com/LeoLTM/3devo-gui/releases/latest).
2. Run the installer and follow the prompts.


## Usage

1. Launch the application from your Start Menu or Desktop shortcut.
2. Connect your 3devo extruder via USB.
3. Use the GUI and use the USB port dropdown to select your device. If it does not appear, check the USB cable and click **Refresh**.
4. Click **Connect** and wait for a few seconds.
5. Click **Send Wakeup** to initialize the extruder. It will restart the microcontroller in the extruder so it starts sending data.
6. You can now monitor the extruder using the GUI.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
