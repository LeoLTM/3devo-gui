mod config;
mod parser;

use config::AppConfig;
use parser::{is_header_line, DataRow, ParserState};
use serde::Serialize;
use serialport::SerialPortType;
use std::io::{BufRead, BufReader, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{Emitter, State};
use tokio::task::JoinHandle;

#[derive(Debug, Serialize, Clone)]
struct PortInfo {
    port_name: String,
    port_type: String,
    // USB device information (optional, only present for USB ports)
    vendor_id: Option<u16>,
    product_id: Option<u16>,
    manufacturer: Option<String>,
    product: Option<String>,
    serial_number: Option<String>,
}

struct SerialState {
    current_port: Arc<Mutex<Option<Box<dyn serialport::SerialPort + Send>>>>,
    parser_state: Arc<Mutex<ParserState>>,
    init_block: Arc<Mutex<Vec<String>>>,
    abort_flag: Arc<AtomicBool>,
    task_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn list_serial_ports() -> Result<Vec<PortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| {
        eprintln!("[ERROR] Failed to list serial ports: {}", e);
        e.to_string()
    })?;
    
    let port_infos: Vec<PortInfo> = ports
        .iter()
        .map(|p| {
            let (port_type, vendor_id, product_id, manufacturer, product, serial_number) = match &p.port_type {
                SerialPortType::UsbPort(usb_info) => (
                    "USB".to_string(),
                    Some(usb_info.vid),
                    Some(usb_info.pid),
                    usb_info.manufacturer.clone(),
                    usb_info.product.clone(),
                    usb_info.serial_number.clone(),
                ),
                SerialPortType::PciPort => ("PCI".to_string(), None, None, None, None, None),
                SerialPortType::BluetoothPort => ("Bluetooth".to_string(), None, None, None, None, None),
                SerialPortType::Unknown => ("Unknown".to_string(), None, None, None, None, None),
            };
            
            PortInfo {
                port_name: p.port_name.clone(),
                port_type,
                vendor_id,
                product_id,
                manufacturer,
                product,
                serial_number,
            }
        })
        .collect();
    
    eprintln!("[INFO] Found {} serial ports", port_infos.len());
    Ok(port_infos)
}

#[tauri::command]
async fn connect_serial_port(
    port_name: String,
    baud_rate: u32,
    window: tauri::Window,
    state: State<'_, SerialState>,
) -> Result<(), String> {
    eprintln!("[INFO] Attempting to connect to {} at {} baud", port_name, baud_rate);
    
    // Reset abort flag for new connection
    state.abort_flag.store(false, Ordering::Relaxed);
    
    // Open the serial port
    let port = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(100))
        .open()
        .map_err(|e| {
            let error_msg = format!("Failed to open port {}: {}", port_name, e);
            eprintln!("[ERROR] {}", error_msg);
            error_msg
        })?;
    
    // Clone port for writing
    let write_port = port.try_clone().map_err(|e| {
        eprintln!("[ERROR] Failed to clone port {}: {}", port_name, e);
        e.to_string()
    })?;
    
    // Store the write port in state
    *state.current_port.lock().unwrap() = Some(write_port);
    
    eprintln!("[INFO] Successfully opened port {}", port_name);
    
    // Clone state references for the async task
    let parser_state = Arc::clone(&state.parser_state);
    let init_block = Arc::clone(&state.init_block);
    let abort_flag = Arc::clone(&state.abort_flag);
    let port_name_for_task = port_name.clone();
    
    // Spawn a task to read from serial port
    let handle = tokio::spawn(async move {
        let mut reader = BufReader::new(port);
        let mut line = String::new();
        let disconnect_reason: String;
        
        'read_loop: loop {
            // Check abort flag
            if abort_flag.load(Ordering::Relaxed) {
                disconnect_reason = "Connection closed by user".to_string();
                break 'read_loop;
            }
            
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => {
                    // EOF - device disconnected
                    disconnect_reason = format!("Device {} disconnected (EOF)", port_name_for_task);
                    break 'read_loop;
                }
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
                    disconnect_reason = format!("Error reading from {}: {}", port_name_for_task, e);
                    eprintln!("[ERROR] {}", disconnect_reason);
                    let _ = window.emit("serial-error", disconnect_reason.clone());
                    break 'read_loop;
                }
            }
        }
        
        // Emit disconnect event when task exits
        eprintln!("[INFO] Serial task exiting: {}", disconnect_reason);
        let _ = window.emit("serial-disconnected", disconnect_reason);
    });
    
    // Store task handle
    *state.task_handle.lock().unwrap() = Some(handle);
    
    Ok(())
}

#[tauri::command]
async fn disconnect_serial_port(state: State<'_, SerialState>) -> Result<(), String> {
    eprintln!("[INFO] Disconnecting serial port");
    
    // Set abort flag to stop the read task
    state.abort_flag.store(true, Ordering::Relaxed);
    
    // Drop the port handle
    *state.current_port.lock().unwrap() = None;
    
    // Extract task handle (need to drop mutex guard before await)
    let task_handle = state.task_handle.lock().unwrap().take();
    
    // Wait for task to complete (with timeout)
    if let Some(handle) = task_handle {
        match tokio::time::timeout(Duration::from_secs(2), handle).await {
            Ok(_) => eprintln!("[INFO] Serial task terminated successfully"),
            Err(_) => eprintln!("[WARN] Serial task termination timed out"),
        }
    }
    
    // Reset parser state and clear init block
    *state.parser_state.lock().unwrap() = ParserState::Init;
    state.init_block.lock().unwrap().clear();
    
    eprintln!("[INFO] Serial port disconnected successfully");
    Ok(())
}

#[tauri::command]
fn send_wakeup(state: State<'_, SerialState>) -> Result<(), String> {
    let mut port_lock = state.current_port.lock().unwrap();
    
    if let Some(port) = port_lock.as_mut() {
        port.write_all(b"\n")
            .map_err(|e| {
                let error_msg = format!("Failed to send wakeup: {}", e);
                eprintln!("[ERROR] {}", error_msg);
                error_msg
            })?;
        port.flush()
            .map_err(|e| {
                let error_msg = format!("Failed to flush: {}", e);
                eprintln!("[ERROR] {}", error_msg);
                error_msg
            })?;
        eprintln!("[INFO] Wakeup signal sent successfully");
        Ok(())
    } else {
        let error_msg = "Not connected to a serial port".to_string();
        eprintln!("[ERROR] {}", error_msg);
        Err(error_msg)
    }
}

#[tauri::command]
fn get_config() -> Result<AppConfig, String> {
    config::load_config()
}

#[tauri::command]
fn set_output_path(path: String) -> Result<AppConfig, String> {
    let mut cfg = config::load_config()?;
    cfg.output_path = path;
    config::save_config(&cfg)?;
    Ok(cfg)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(SerialState {
            current_port: Arc::new(Mutex::new(None)),
            parser_state: Arc::new(Mutex::new(ParserState::Init)),
            init_block: Arc::new(Mutex::new(Vec::new())),
            abort_flag: Arc::new(AtomicBool::new(false)),
            task_handle: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            list_serial_ports,
            connect_serial_port,
            disconnect_serial_port,
            send_wakeup,
            get_config,
            set_output_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
