use serde::{Deserialize, Serialize};

/// Represents the parsing state of the serial connection
#[derive(Debug, Clone, PartialEq)]
pub enum ParserState {
    /// Reading initialization block (device info, firmware, etc.)
    Init,
    /// Header line detected, ready to parse data rows
    HeaderDetected,
    /// Actively streaming data rows
    DataStreaming,
}

/// Status enum for the extruder system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SystemStatus {
    IDLE,
    HOMING,
    HEATING,
    PREPARED,
    RUNNING,
    ERROR,
    Unknown(String),
}

impl From<&str> for SystemStatus {
    fn from(s: &str) -> Self {
        match s.trim().to_uppercase().as_str() {
            "IDLE" => SystemStatus::IDLE,
            "HOMING" => SystemStatus::HOMING,
            "HEATING" => SystemStatus::HEATING,
            "PREPARED" => SystemStatus::PREPARED,
            "RUNNING" => SystemStatus::RUNNING,
            "ERROR" => SystemStatus::ERROR,
            _ => SystemStatus::Unknown(s.to_string()),
        }
    }
}

/// Represents a single row of data from the filament extruder
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataRow {
    // Time
    pub time: f64,

    // Heater 1
    pub set_t1: f64,
    pub temp1: f64,
    pub dc1: f64,
    pub err1: i32,

    // Heater 2
    pub set_t2: f64,
    pub temp2: f64,
    pub dc2: f64,
    pub err2: i32,

    // Heater 3
    pub set_t3: f64,
    pub temp3: f64,
    pub dc3: f64,
    pub err3: i32,

    // Heater 4
    pub set_t4: f64,
    pub temp4: f64,
    pub dc4: f64,
    pub err4: i32,

    // Internal temperature
    pub int_t4: f64,

    // Extruder motor
    pub ext_cur: f64,
    pub ext_pwm: i32,
    pub ext_tmp: f64,

    // Unused
    pub unused: i32,

    // Motor status
    pub fault: i32,
    pub set_rpm: f64,
    pub rpm: f64,

    // Filament
    pub ft: f64,
    pub ft_avg: f64,

    // Puller
    pub puller: i32,

    // Memory
    pub mem_free: i32,

    // Status
    pub status: SystemStatus,

    // Winder and positioner
    pub wndr_spd: f64,
    pub pos_spd: f64,

    // Length and volume
    pub length: f64,
    pub volume: f64,

    // Spool
    pub sp_dia: f64,
    pub sp_fill: f64,

    // Filament sensor
    pub fs_int_t: i32,
}

impl DataRow {
    /// Parse a data row from a line of text
    /// Supports both tab-delimited and whitespace-delimited formats
    pub fn parse(line: &str) -> Result<Self, String> {
        // Try tab-delimited first, fall back to whitespace
        let fields: Vec<&str> = if line.contains('\t') {
            line.split('\t').collect()
        } else {
            line.split_whitespace().collect()
        };

        // Expect exactly 37 fields (indices 0-36)
        if fields.len() < 37 {
            return Err(format!(
                "Expected at least 37 fields, got {}. Line: '{}'",
                fields.len(),
                line
            ));
        }

        // Helper function to parse with better error messages
        fn parse_field<T: std::str::FromStr>(
            field: &str,
            index: usize,
            name: &str,
        ) -> Result<T, String> {
            field.trim().parse::<T>().map_err(|_| {
                format!(
                    "Failed to parse field {} ('{}') at position {}",
                    name, field, index
                )
            })
        }

        Ok(DataRow {
            time: parse_field(fields[0], 0, "Time")?,
            set_t1: parse_field(fields[1], 1, "SetT1")?,
            temp1: parse_field(fields[2], 2, "Temp1")?,
            dc1: parse_field(fields[3], 3, "dc1")?,
            err1: parse_field(fields[4], 4, "Err1")?,
            set_t2: parse_field(fields[5], 5, "SetT2")?,
            temp2: parse_field(fields[6], 6, "Temp2")?,
            dc2: parse_field(fields[7], 7, "dc2")?,
            err2: parse_field(fields[8], 8, "Err2")?,
            set_t3: parse_field(fields[9], 9, "SetT3")?,
            temp3: parse_field(fields[10], 10, "Temp3")?,
            dc3: parse_field(fields[11], 11, "dc3")?,
            err3: parse_field(fields[12], 12, "Err3")?,
            set_t4: parse_field(fields[13], 13, "SetT4")?,
            temp4: parse_field(fields[14], 14, "Temp4")?,
            dc4: parse_field(fields[15], 15, "dc4")?,
            err4: parse_field(fields[16], 16, "Err4")?,
            int_t4: parse_field(fields[17], 17, "intT4")?,
            ext_cur: parse_field(fields[18], 18, "ExtCur")?,
            ext_pwm: parse_field(fields[19], 19, "ExtPWM")?,
            ext_tmp: parse_field(fields[20], 20, "ExtTmp")?,
            unused: parse_field(fields[21], 21, "Unused")?,
            fault: parse_field(fields[22], 22, "FAULT")?,
            set_rpm: parse_field(fields[23], 23, "SetRPM")?,
            rpm: parse_field(fields[24], 24, "RPM")?,
            ft: parse_field(fields[25], 25, "FT")?,
            ft_avg: parse_field(fields[26], 26, "FTAVG")?,
            puller: parse_field(fields[27], 27, "Puller")?,
            mem_free: parse_field(fields[28], 28, "MemFree")?,
            status: SystemStatus::from(fields[29]),
            wndr_spd: parse_field(fields[30], 30, "WndrSpd")?,
            pos_spd: parse_field(fields[31], 31, "PosSpd")?,
            length: parse_field(fields[32], 32, "Length")?,
            volume: parse_field(fields[33], 33, "Volume")?,
            sp_dia: parse_field(fields[34], 34, "SpDia")?,
            sp_fill: parse_field(fields[35], 35, "SpFill")?,
            fs_int_t: parse_field(fields[36], 36, "FsIntT")?,
        })
    }
}

/// Check if a line is the header line
pub fn is_header_line(line: &str) -> bool {
    let line_upper = line.to_uppercase();
    // Check if the line starts with "TIME" and contains other expected header fields
    line_upper.starts_with("TIME") && line_upper.contains("SETT1") && line_upper.contains("TEMP1")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_data_row_tab_delimited() {
        let line = "1\t265\t49.25\t0\t0\t275\t76.25\t0\t0\t265\t68.25\t0\t0\t255\t82.50\t0\t0\t21.75\t0\t0\t23\t0\t0\t1500\t0\t0\t0\t640\t1689\tIDLE\t271\t0\t0\t0\t105\t0\t21000";
        let result = DataRow::parse(line);
        assert!(result.is_ok());
        let data = result.unwrap();
        assert_eq!(data.time, 1.0);
        assert_eq!(data.set_t1, 265.0);
        assert_eq!(data.temp1, 49.25);
        assert_eq!(data.status, SystemStatus::IDLE);
    }

    #[test]
    fn test_parse_data_row_whitespace_delimited() {
        let line = "1 265 49.25 0 0 275 76.25 0 0 265 68.25 0 0 255 82.50 0 0 21.75 0 0 23 0 0 1500 0 0 0 640 1689 IDLE 271 0 0 0 105 0 21000";
        let result = DataRow::parse(line);
        assert!(result.is_ok());
        let data = result.unwrap();
        assert_eq!(data.time, 1.0);
        assert_eq!(data.set_t1, 265.0);
    }

    #[test]
    fn test_is_header_line() {
        let header = "Time\tSetT1\tTemp1\tdc1\tErr1\tSetT2\tTemp2\tdc2\tErr2\tSetT3\tTemp3\tdc3\tErr3\tSetT4\tTemp4\tdc4\tErr4\tintT4\tExtCur\tExtPWM\tExtTmp\tUnused\tFAULT\tSetRPM\tRPM\tFT\tFTAVG\tPuller\tMemFree\tStatus\tWndrSpd\tPosSpd\tLength\tVolume\tSpDia\tSpFill\tFsIntT";
        assert!(is_header_line(header));
        
        let data_line = "1\t265\t49.25\t0\t0\t275\t76.25\t0\t0\t265\t68.25\t0\t0\t255\t82.50";
        assert!(!is_header_line(data_line));
    }

    #[test]
    fn test_system_status_parsing() {
        assert_eq!(SystemStatus::from("IDLE"), SystemStatus::IDLE);
        assert_eq!(SystemStatus::from("RUNNING"), SystemStatus::RUNNING);
        assert_eq!(SystemStatus::from("ERROR"), SystemStatus::ERROR);
        assert!(matches!(
            SystemStatus::from("UNKNOWN"),
            SystemStatus::Unknown(_)
        ));
    }

    #[test]
    fn test_parse_actual_log_data() {
        // Actual data row from production log file
        let line = "1\t265\t49.25\t0\t0\t275\t76.25\t0\t0\t265\t68.25\t0\t0\t255\t82.50\t0\t0\t21.75\t0\t0\t23\t0\t0\t1500\t0\t0\t0\t640\t1689\tIDLE\t271\t0\t0\t0\t105\t0\t21000";
        let result = DataRow::parse(line);
        assert!(result.is_ok(), "Failed to parse actual log data: {:?}", result.err());
        
        let data = result.unwrap();
        assert_eq!(data.time, 1.0);
        assert_eq!(data.set_t1, 265.0);
        assert_eq!(data.temp1, 49.25);
        assert_eq!(data.dc1, 0.0);
        assert_eq!(data.err1, 0);
        assert_eq!(data.set_t2, 275.0);
        assert_eq!(data.temp2, 76.25);
        assert_eq!(data.int_t4, 21.75);
        assert_eq!(data.ext_cur, 0.0);
        assert_eq!(data.ext_pwm, 0);
        assert_eq!(data.ext_tmp, 23.0);
        assert_eq!(data.unused, 0);
        assert_eq!(data.fault, 0);
        assert_eq!(data.set_rpm, 1500.0);
        assert_eq!(data.rpm, 0.0);
        assert_eq!(data.ft, 0.0);
        assert_eq!(data.ft_avg, 0.0);
        assert_eq!(data.puller, 640);
        assert_eq!(data.mem_free, 1689);
        assert_eq!(data.status, SystemStatus::IDLE);
        assert_eq!(data.wndr_spd, 271.0);
        assert_eq!(data.pos_spd, 0.0);
        assert_eq!(data.length, 0.0);
        assert_eq!(data.volume, 0.0);
        assert_eq!(data.sp_dia, 105.0);
        assert_eq!(data.sp_fill, 0.0);
        assert_eq!(data.fs_int_t, 21000);
    }
}
