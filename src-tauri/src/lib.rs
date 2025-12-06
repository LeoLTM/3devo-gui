mod parser;

use parser::{is_header_line, DataRow, ParserState};
use serde::Serialize;
use serialport::SerialPortType;
use std::io::{BufRead, BufReader, Write};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{Emitter, State};

#[derive(Debug, Serialize, Clone)]
struct PortInfo {
    port_name: String,
    port_type: String,
}

struct SerialState {
    current_port: Arc<Mutex<Option<Box<dyn serialport::SerialPort + Send>>>>,
    parser_state: Arc<Mutex<ParserState>>,
    init_block: Arc<Mutex<Vec<String>>>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn list_serial_ports() -> Result<Vec<PortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| e.to_string())?;
    
    let port_infos: Vec<PortInfo> = ports
        .iter()
        .map(|p| PortInfo {
            port_name: p.port_name.clone(),
            port_type: match &p.port_type {
                SerialPortType::UsbPort(_) => "USB".to_string(),
                SerialPortType::PciPort => "PCI".to_string(),
                SerialPortType::BluetoothPort => "Bluetooth".to_string(),
                SerialPortType::Unknown => "Unknown".to_string(),
            },
        })
        .collect();
    
    Ok(port_infos)
}

#[tauri::command]
async fn connect_serial_port(
    port_name: String,
    baud_rate: u32,
    window: tauri::Window,
    state: State<'_, SerialState>,
) -> Result<(), String> {
    // Open the serial port
    let port = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(100))
        .open()
        .map_err(|e| format!("Failed to open port: {}", e))?;
    
    // Clone port for writing
    let write_port = port.try_clone().map_err(|e| e.to_string())?;
    
    // Store the write port in state
    *state.current_port.lock().unwrap() = Some(write_port);
    
    // Clone state references for the async task
    let parser_state = Arc::clone(&state.parser_state);
    let init_block = Arc::clone(&state.init_block);
    
    // Spawn a task to read from serial port
    tokio::spawn(async move {
        let mut reader = BufReader::new(port);
        let mut line = String::new();
        
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break, // EOF
                Ok(_) => {
                    let trimmed = line.trim_end();
                    
                    // Always emit raw data for the serial monitor
                    let _ = window.emit("serial-data", trimmed.to_string());
                    
                    // Parse the line based on current state
                    let mut state = parser_state.lock().unwrap();
                    
                    match *state {
                        ParserState::Init => {
                            // Check if this is the header line
                            if is_header_line(trimmed) {
                                *state = ParserState::HeaderDetected;
                                
                                // Emit init block if we have accumulated any
                                let init_lines = init_block.lock().unwrap();
                                if !init_lines.is_empty() {
                                    let _ = window.emit("init-block", init_lines.join("\n"));
                                }
                                
                                let _ = window.emit("header-detected", trimmed.to_string());
                            } else {
                                // Accumulate init block lines
                                init_block.lock().unwrap().push(trimmed.to_string());
                            }
                        }
                        ParserState::HeaderDetected => {
                            // Try to parse as data row
                            match DataRow::parse(trimmed) {
                                Ok(data_row) => {
                                    *state = ParserState::DataStreaming;
                                    let _ = window.emit("data-row", data_row);
                                }
                                Err(e) => {
                                    // Log parse error but continue
                                    let _ = window.emit(
                                        "parse-warning",
                                        format!("Failed to parse data row: {}", e),
                                    );
                                }
                            }
                        }
                        ParserState::DataStreaming => {
                            // Check if we got a header again (reconnection)
                            if is_header_line(trimmed) {
                                let _ = window.emit("header-detected", trimmed.to_string());
                            } else {
                                // Parse data row
                                match DataRow::parse(trimmed) {
                                    Ok(data_row) => {
                                        let _ = window.emit("data-row", data_row);
                                    }
                                    Err(e) => {
                                        let _ = window.emit(
                                            "parse-warning",
                                            format!("Failed to parse data row: {}", e),
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                    // Timeout is expected, continue
                    continue;
                }
                Err(e) => {
                    let _ = window.emit("serial-error", format!("Error reading: {}", e));
                    break;
                }
            }
        }
    });
    
    Ok(())
}

#[tauri::command]
fn disconnect_serial_port(state: State<'_, SerialState>) -> Result<(), String> {
    *state.current_port.lock().unwrap() = None;
    // Reset parser state but keep init block for reconnection
    *state.parser_state.lock().unwrap() = ParserState::Init;
    Ok(())
}

#[tauri::command]
fn send_wakeup(state: State<'_, SerialState>) -> Result<(), String> {
    let mut port_lock = state.current_port.lock().unwrap();
    
    if let Some(port) = port_lock.as_mut() {
        port.write_all(b"\n")
            .map_err(|e| format!("Failed to send wakeup: {}", e))?;
        port.flush()
            .map_err(|e| format!("Failed to flush: {}", e))?;
        Ok(())
    } else {
        Err("Not connected to a serial port".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(SerialState {
            current_port: Arc::new(Mutex::new(None)),
            parser_state: Arc::new(Mutex::new(ParserState::Init)),
            init_block: Arc::new(Mutex::new(Vec::new())),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            list_serial_ports,
            connect_serial_port,
            disconnect_serial_port,
            send_wakeup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
