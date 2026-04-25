#!/usr/bin/env python3
import json
import os

# Set this to the exact directory Chromium is rendering from
OUTPUT_FILE = "/home/askozicki/tony/system.json"
TEMP_FILE = "/sys/class/thermal/thermal_zone0/temp"
LOAD_FILE = "/proc/loadavg"

def get_cpu_temp():
    try:
        with open(TEMP_FILE, "r") as f:
            temp_millicelsius = int(f.read().strip())
            return round(temp_millicelsius / 1000.0, 1)
    except Exception:
        return "ERR"

def get_load_average():
    try:
        with open(LOAD_FILE, "r") as f:
            load_1m = f.read().split()[0]
            return load_1m
    except Exception:
        return "ERR"

def write_telemetry():
    data = {
        "cpu_temp": get_cpu_temp(),
        "load_1m": get_load_average()
    }
    
    tmp_file = OUTPUT_FILE + ".tmp"
    try:
        with open(tmp_file, "w") as f:
            json.dump(data, f)
        os.rename(tmp_file, OUTPUT_FILE)
    except Exception as e:
        pass

if __name__ == "__main__":
    write_telemetry()
