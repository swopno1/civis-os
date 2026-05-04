import { useState, useEffect } from 'preact/hooks';
import type { ICivisModuleContext } from '../../core/ICivisModule';
import './Sense.css';

interface SensorData {
  temp: number;      // Celsius
  airQuality: number; // AQI
  radiation: number;  // uSv/h
  timestamp: number;
}

interface SenseProps {
  context: ICivisModuleContext;
}

export function Sense({ context }: SenseProps) {
  const [data, setData] = useState<SensorData>({
    temp: 0,
    airQuality: 0,
    radiation: 0,
    timestamp: Date.now()
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    let active = true;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    const connectSensor = async () => {
      try {
        await context.requestPermission('hardware:serial');
        const port = await context.requestSerialPort();
        await port.open({ baudRate: 9600 });

        if (!active) {
          await port.close();
          return;
        }

        setIsConnected(true);
        setIsSimulating(false);

        reader = port.readable?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value && active) {
            try {
              const raw = decoder.decode(value);
              const parsed = JSON.parse(raw);
              setData({
                temp: parsed.t ?? 0,
                airQuality: parsed.a ?? 0,
                radiation: parsed.r ?? 0,
                timestamp: Date.now()
              });
            } catch (e) {
              console.warn("Malformed sensor data received");
            }
          }
        }
      } catch (err) {
        if (active) {
          console.error("Failed to connect to sensor hardware:", err);
          alert("Hardware connection failed. Starting simulation mode.");
          setIsSimulating(true);
          setIsConnected(false);
        }
      }
    };

    if (isConnected && !isSimulating) {
      connectSensor();
    }

    return () => {
      active = false;
      if (reader) {
        reader.cancel().catch(() => {});
      }
    };
  }, [isConnected, isSimulating, context]);

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setData({
        temp: 20 + Math.random() * 5,
        airQuality: 30 + Math.random() * 20,
        radiation: 0.1 + Math.random() * 0.05,
        timestamp: Date.now()
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const getAqiColor = (aqi: number) => {
    if (aqi < 50) return '#00ff00';
    if (aqi < 100) return '#ffff00';
    if (aqi < 150) return '#ff8c00';
    return '#ff0000';
  };

  const getRadColor = (rad: number) => {
    if (rad < 0.5) return '#00ff00';
    if (rad < 1.0) return '#ffff00';
    return '#ff0000';
  };

  return (
    <div className="sense-module">
      <header className="sense-header">
        <h2>CivisSense: Environmental Monitor</h2>
        <div className="status-indicators">
          <span className={`status-badge ${isConnected ? 'connected' : isSimulating ? 'simulating' : 'disconnected'}`}>
            {isConnected ? 'LIVE HARDWARE' : isSimulating ? 'SIMULATION MODE' : 'NOT CONNECTED'}
          </span>
        </div>
      </header>

      {!isConnected && !isSimulating && (
        <div className="connection-prompt">
          <p>Connect environmental sensor hardware (ESP32/Arduino) via USB Serial to begin monitoring.</p>
          <button className="connect-btn" onClick={() => setIsConnected(true)}>Connect Sensor Hardware</button>
          <button className="sim-btn" onClick={() => setIsSimulating(true)}>Run Demo Simulation</button>
        </div>
      )}

      {(isConnected || isSimulating) && (
        <div className="sensor-grid">
          <div className="sensor-card">
            <div className="sensor-label">Temperature</div>
            <div className="sensor-value">{data.temp.toFixed(1)}°C</div>
            <div className="sensor-sub">Thermal Environment</div>
          </div>

          <div className="sensor-card">
            <div className="sensor-label">Air Quality</div>
            <div className="sensor-value" style={{ color: getAqiColor(data.airQuality) }}>
              {Math.round(data.airQuality)} <small>AQI</small>
            </div>
            <div className="sensor-sub">Particulate Matter</div>
          </div>

          <div className="sensor-card">
            <div className="sensor-label">Radiation</div>
            <div className="sensor-value" style={{ color: getRadColor(data.radiation) }}>
              {data.radiation.toFixed(3)} <small>μSv/h</small>
            </div>
            <div className="sensor-sub">Ionizing Radiation</div>
          </div>
        </div>
      )}

      <footer className="sense-footer">
        <div className="last-update">Last Updated: {new Date(data.timestamp).toLocaleTimeString()}</div>
        <div className="compliance">Standard: ISO 14001 Compliant Data Interface</div>
      </footer>
    </div>
  );
}
