use chrono::Local;
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};

// ---------------------------------------------------------------------------
// LogWriter trait – extension point for future enriched-format writers
// ---------------------------------------------------------------------------

/// Trait for serial data log writers.
///
/// Each implementation receives every raw serial line and is responsible for
/// persisting it in its own format.  A second writer (e.g. an enriched
/// format with markers/flags) can be added later by implementing this trait
/// and registering the writer with [`LogManager::add_writer`].
pub trait LogWriter: Send {
    /// Write a single line to the log. Implementors should ensure durability.
    fn write_line(&mut self, line: &str) -> io::Result<()>;

    /// Finalize the log file (flush + sync metadata).
    fn close(&mut self) -> io::Result<()>;

    /// The path of the file being written.
    fn file_path(&self) -> &Path;
}

// ---------------------------------------------------------------------------
// RawLogWriter – plain-text, line-for-line copy of the serial stream
// ---------------------------------------------------------------------------

/// Writes every serial line verbatim to a `.txt` file.
///
/// Each line is followed by a `sync_data()` call so that data is durable on
/// disk even if the application is killed or the machine loses power.
pub struct RawLogWriter {
    file: File,
    path: PathBuf,
}

impl RawLogWriter {
    /// Open a new log file at the given path.
    ///
    /// Uses `create_new(true)` which fails if the file already exists,
    /// guaranteeing that existing files are never overwritten.
    fn open(path: PathBuf) -> io::Result<Self> {
        let file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)?;
        Ok(Self { file, path })
    }
}

impl LogWriter for RawLogWriter {
    fn write_line(&mut self, line: &str) -> io::Result<()> {
        writeln!(self.file, "{}", line)?;
        // Flush the internal buffer and push data to the OS / disk.
        // This ensures the line survives a process crash or power loss.
        self.file.sync_data()?;
        Ok(())
    }

    fn close(&mut self) -> io::Result<()> {
        self.file.sync_all()
    }

    fn file_path(&self) -> &Path {
        &self.path
    }
}

// ---------------------------------------------------------------------------
// LogManager – orchestrates one or more LogWriters
// ---------------------------------------------------------------------------

/// Manages a set of [`LogWriter`]s that all receive every serial line.
///
/// Logging errors are printed to stderr but **never** propagated upward –
/// a failing log must not disrupt the serial read loop.
pub struct LogManager {
    writers: Vec<Box<dyn LogWriter>>,
}

impl LogManager {
    /// Create an empty manager (no writers yet).
    pub fn new() -> Self {
        Self {
            writers: Vec::new(),
        }
    }

    /// Register a writer. It will receive all subsequent lines.
    pub fn add_writer(&mut self, writer: Box<dyn LogWriter>) {
        eprintln!(
            "[LOG] Writer opened: {}",
            writer.file_path().display()
        );
        self.writers.push(writer);
    }

    /// Forward a line to every registered writer.
    ///
    /// Errors are logged to stderr but swallowed so the serial loop
    /// continues uninterrupted.
    pub fn write_line(&mut self, line: &str) {
        for w in &mut self.writers {
            if let Err(e) = w.write_line(line) {
                eprintln!(
                    "[LOG ERROR] Failed to write to {}: {}",
                    w.file_path().display(),
                    e
                );
            }
        }
    }

    /// Close and sync all writers. Called when the serial connection ends.
    pub fn close_all(&mut self) {
        for w in &mut self.writers {
            if let Err(e) = w.close() {
                eprintln!(
                    "[LOG ERROR] Failed to close {}: {}",
                    w.file_path().display(),
                    e
                );
            } else {
                eprintln!(
                    "[LOG] Writer closed: {}",
                    w.file_path().display()
                );
            }
        }
        self.writers.clear();
    }
}

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

/// Generate a unique log filename inside `output_dir`.
///
/// Format: `3devo-gui-output_YYYY-MM-DD_HH-MM-SS.txt`
///
/// If a file with that name already exists (e.g. rapid reconnects within the
/// same second), a numeric suffix `_1`, `_2`, … is appended until a free
/// name is found. This guarantees that **no existing file is ever
/// overwritten**.
pub fn generate_log_filename(output_dir: &str) -> PathBuf {
    let now = Local::now();
    let base_name = now.format("3devo-gui-output_%Y-%m-%d_%H-%M-%S").to_string();
    let dir = Path::new(output_dir);

    // Try without suffix first
    let candidate = dir.join(format!("{}.txt", base_name));
    if !candidate.exists() {
        return candidate;
    }

    // Append incrementing suffix until we find a free name
    for i in 1u32.. {
        let candidate = dir.join(format!("{}_{}.txt", base_name, i));
        if !candidate.exists() {
            return candidate;
        }
    }

    unreachable!("Could not find a free filename")
}

/// Create a [`RawLogWriter`] in the given output directory.
///
/// The directory is created (recursively) if it does not exist yet.
pub fn create_raw_log_writer(output_dir: &str) -> io::Result<RawLogWriter> {
    fs::create_dir_all(output_dir)?;
    let path = generate_log_filename(output_dir);
    RawLogWriter::open(path)
}
