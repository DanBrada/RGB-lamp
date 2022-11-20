import {useEffect, useState} from "react";
import {ConnectionInfo} from "./ConnectionInfo";
import {BleManager, Device, DeviceId} from "react-native-ble-plx";
import {SensorsInfo} from "./SensorsInfo";
import base64 from "react-native-base64"

const manager = new BleManager();

export function useLampInfo(serviceUid: string, CharacteristicUUID: string) {
	const [lampEnabled, setLamp] = useState<boolean>(false)
	const [connection, updateConnection] = useState<ConnectionInfo>(ConnectionInfo.DISCONNECTED)
	const [devices, updateDevices] = useState<Device[]>(null)
	const [sensorInfo, updateSensorsInfo] = useState<SensorsInfo>(null)
	const [deviceName, setDeviceName] = useState<string>(null)
	const [deviceId, setDeviceId] = useState<DeviceId>(null)
	const [currentMode, updateCurrentMode] = useState<string>("weather")

	useEffect(() => {
		manager.startDeviceScan([serviceUid], null, (e, device) => {
			if (devices === null) {
				console.log(device.id, device.name)
				updateDevices([device])
			}
			if (!e && (devices?.length == 0 || devices?.filter(({id}) => {
				return id == device.id
			}).length == 0)) {
				console.log(device.name)
				devices.push(device)
				console.log(devices)
				updateDevices(devices)
			} else if (e != null) console.log(`error: ${e}`)
		})
	}, [])

	useEffect(() => {
		if (sensorInfo == null) return;

		setLamp(sensorInfo.lampStatus)
	}, [sensorInfo])


	return {
		lampEnabled,
		sensorInfo,
		connection,
		devices,
		deviceName,
		toggle: () => {
			manager.writeCharacteristicWithResponseForDevice(deviceId, serviceUid, CharacteristicUUID, base64.encode(JSON.stringify({
				state: !lampEnabled,
				mode: currentMode,
				brightness: 100
			}))).then(char => {
				console.log("characteristic written")
			})
				.catch(console.warn)
			setLamp(!lampEnabled)
		},
		setModeFill: (color: string) => {
			manager.writeCharacteristicWithResponseForDevice(deviceId, serviceUid, CharacteristicUUID, base64.encode(JSON.stringify({
				state: lampEnabled,
				mode: "fill",
				brightness: 100,
				value: {
					r: Number(`0x${color.substring(1, 3)}`),
					g: Number(`0x${color.substring(3, 5)}`),
					b: Number(`0x${color.substring(5)}`)
				}
			}))).then(() => {
				updateCurrentMode("fill")
				console.log("gotem")
			})
				.catch(console.warn)
		},
		setModeWeather: () => {
			manager.writeCharacteristicWithResponseForDevice(deviceId, serviceUid, CharacteristicUUID, base64.encode(JSON.stringify({
				state: lampEnabled,
				mode: "weather",
				brightness: 100
			}))).then(char => {
				updateCurrentMode("weather")
				console.log("characteristic written")
			})
				.catch(console.warn)
		},
		setModeRainbow: ()=>{
			manager.writeCharacteristicWithResponseForDevice(deviceId, serviceUid, CharacteristicUUID, base64.encode(JSON.stringify({
				state: lampEnabled,
				mode: "rainbow",
				brightness: 100
			}))).then(char => {
				updateCurrentMode("rainbow")
				console.log("characteristic written")
			})
				.catch(console.warn)
		},
		createConnection: (device: Device) => {
			console.log(`Connecting to ${device.name}`)
			updateConnection(ConnectionInfo.CONNECTING)
			manager.connectToDevice(device.id).then(conn => {
				updateConnection(ConnectionInfo.CONNECTED)
				manager.discoverAllServicesAndCharacteristicsForDevice(conn.id).then(d => {
					manager.monitorCharacteristicForDevice(d.id, serviceUid, CharacteristicUUID, (e, characteristic) => {
						if (!e) {
							const val = base64.decode(characteristic.value)
							const valSplit = val.split(",")
							console.log(val)

							updateSensorsInfo({
								temeprature: parseFloat(valSplit[0]),
								humidity: parseFloat(valSplit[1]),
								lampStatus: valSplit[2] == "true"
							})

							updateConnection(ConnectionInfo.CONNECTED)
						} else {
							console.error(e)
							console.log(e.androidErrorCode?.toString())
							console.log(e.reason)
							console.log(e.errorCode.toString())
							if (e.errorCode == 201) updateConnection(ConnectionInfo.DISCONNECTED)
						}
					})

					console.log("Done setting up device!")

					d.onDisconnected((er, dev) => {
						console.warn("Disconnected")
						updateConnection(ConnectionInfo.DISCONNECTED)
						updateDevices([])
					})

					setDeviceName(d.name)
					setDeviceId(d.id)
				})
			})
				.catch(() => {
					console.error("couldn't connect do device")
					updateConnection(ConnectionInfo.DISCONNECTED)
				})
		},
	}
}
