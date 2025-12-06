import { DataRow, formatTemperature, formatDiameter, formatPercentage, formatRPM, getStatusDisplay, isFaultActive } from "@/types/extruder";
import { Card } from "@/components/ui/card";
import { useStore } from "@/store";

export function Dashboard() {
  const currentData = useStore((state) => state.currentData);
  const isConnected = useStore((state) => state.isConnected);
  const historicalData = useStore((state) => state.historicalData);

  if (!isConnected) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <Card className="p-8 text-center text-gray-500">
          <div className="text-xl">Not Connected</div>
          <div className="text-sm mt-2">Connect to a serial port to view data</div>
        </Card>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <Card className="p-8 text-center text-gray-500">
          <div className="text-xl">Waiting for Data...</div>
          <div className="text-sm mt-2">Listening for extruder data</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold">Extruder Dashboard</h2>

      {/* System Status */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">System Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Status</div>
            <div className={`text-xl font-bold ${
              getStatusDisplay(currentData.status) === 'RUNNING' ? 'text-green-600' :
              getStatusDisplay(currentData.status) === 'ERROR' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {getStatusDisplay(currentData.status)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Fault</div>
            <div className={`text-xl font-bold ${isFaultActive(currentData) ? 'text-red-600' : 'text-green-600'}`}>
              {isFaultActive(currentData) ? 'FAULT' : 'OK'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Runtime</div>
            <div className="text-xl font-bold">{currentData.time.toFixed(1)}s</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Free Memory</div>
            <div className="text-xl font-bold">{currentData.mem_free} bytes</div>
          </div>
        </div>
      </Card>

      {/* Heater Temperatures */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Heater Temperatures</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((heater) => (
            <HeaterCard
              key={heater}
              heaterNum={heater}
              setTemp={currentData[`set_t${heater}` as keyof DataRow] as number}
              actualTemp={currentData[`temp${heater}` as keyof DataRow] as number}
              dutyCycle={currentData[`dc${heater}` as keyof DataRow] as number}
              errors={currentData[`err${heater}` as keyof DataRow] as number}
            />
          ))}
        </div>
      </Card>

      {/* Motor Status */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Extruder Motor</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Set RPM</div>
            <div className="text-xl font-bold">{formatRPM(currentData.set_rpm)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Actual RPM</div>
            <div className="text-xl font-bold text-blue-600">{formatRPM(currentData.rpm)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Current</div>
            <div className="text-xl font-bold">{currentData.ext_cur.toFixed(0)} mA</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">PWM</div>
            <div className="text-xl font-bold">{currentData.ext_pwm}/255</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Temperature</div>
            <div className="text-xl font-bold">{formatTemperature(currentData.ext_tmp)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Puller</div>
            <div className="text-xl font-bold">{currentData.puller} ticks</div>
          </div>
        </div>
      </Card>

      {/* Filament Metrics */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Filament Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Diameter (Instant)</div>
            <div className="text-2xl font-bold text-purple-600">{formatDiameter(currentData.ft)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Diameter (Average)</div>
            <div className="text-2xl font-bold text-purple-600">{formatDiameter(currentData.ft_avg)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Length</div>
            <div className="text-xl font-bold">{currentData.length.toFixed(1)} mm</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Volume</div>
            <div className="text-xl font-bold">{currentData.volume.toFixed(0)} mm³</div>
          </div>
        </div>
      </Card>

      {/* Spooler & Winder */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Spooler & Winder</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Winder Speed</div>
            <div className="text-xl font-bold">{(currentData.wndr_spd / 100).toFixed(2)} RPM</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Positioner Speed</div>
            <div className="text-xl font-bold">{(currentData.pos_spd / 100).toFixed(2)} mm/min</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Spool Diameter</div>
            <div className="text-xl font-bold">{currentData.sp_dia.toFixed(1)} mm</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Spool Fill</div>
            <div className="text-xl font-bold">{formatPercentage(currentData.sp_fill)}</div>
          </div>
        </div>
      </Card>

      {/* Additional Info */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Internal Temp (Board)</div>
            <div className="text-xl font-bold">{formatTemperature(currentData.int_t4)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Sensor Integration Time</div>
            <div className="text-xl font-bold">{currentData.fs_int_t} µs</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Data Points</div>
            <div className="text-xl font-bold">{historicalData.length}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface HeaterCardProps {
  heaterNum: number;
  setTemp: number;
  actualTemp: number;
  dutyCycle: number;
  errors: number;
}

function HeaterCard({ heaterNum, setTemp, actualTemp, dutyCycle, errors }: HeaterCardProps) {
  const tempDiff = Math.abs(setTemp - actualTemp);
  const isHeating = dutyCycle > 0;
  const hasErrors = errors > 0;

  return (
    <div className="border rounded-lg p-3">
      <div className="font-semibold mb-2">Heater {heaterNum}</div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Set:</span>
          <span className="font-medium">{formatTemperature(setTemp)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Actual:</span>
          <span className={`font-medium ${tempDiff > 10 ? 'text-orange-600' : 'text-green-600'}`}>
            {formatTemperature(actualTemp)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Duty Cycle:</span>
          <span className="font-medium">{formatPercentage(dutyCycle)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Errors:</span>
          <span className={`font-medium ${hasErrors ? 'text-red-600' : 'text-green-600'}`}>
            {errors}
          </span>
        </div>
        {isHeating && (
          <div className="text-xs text-orange-600 mt-1">● Heating</div>
        )}
      </div>
    </div>
  );
}
