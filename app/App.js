import {StyleSheet, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {
	Provider as PaperProvider,
	Button,
	Text,
	Surface,
	Dialog,
	ActivityIndicator, IconButton, Divider, Portal
} from "react-native-paper"
import {useLampInfo} from "./src/useLampInfo";
import {ConnectionInfo} from "./src/ConnectionInfo";
import {useEffect, useState} from "react";
import ColorPicker from "react-native-wheel-color-picker";
import Slider from "@react-native-community/slider";

export default function App() {
	const lampInfo = useLampInfo("be17f099-e27e-46a6-afd3-64f9a36b6ded",
		"92942693-ee1a-4106-84c9-7fad6975320f")
	const isLampActive = lampInfo.lampEnabled
	const [selectColor, updateSelectColor] = useState("#E31C79");
	const [displayFillDialog, updateShowFillDialog] = useState(false)

	useEffect(() => {
		if (lampInfo.connection === ConnectionInfo.DISCONNECTED && lampInfo.devices?.length > 0) {
			if (lampInfo.devices?.length === 1) {
				console.log("connecting")
				lampInfo.createConnection(lampInfo.devices[0])
				console.log("connected")
			}
		}
	}, [lampInfo.devices])

	if (lampInfo.connection === ConnectionInfo.DISCONNECTED) return (
		<PaperProvider>
			<View style={styles.container}>
				<ActivityIndicator animating={true} size={"large"}/>
			</View>
		</PaperProvider>
	)

	return (
		<PaperProvider>
			<View style={styles.container}>
				<Portal>
					<Dialog visible={displayFillDialog} onDismiss={()=>updateShowFillDialog(false)}>
						<Dialog.Title>Vyber prosím barvu</Dialog.Title>
						<Dialog.Content style={{
							height:200
						}}>
							<ColorPicker
								color={selectColor}
								onColorChange={updateSelectColor}
								swatches={false}
								shadeWheel={false}
								sliderHidden={true}
								row={true}
							/>
						</Dialog.Content>
						<Dialog.Actions>
							<Button onPress={()=>updateShowFillDialog(false)}>Zrušit</Button>
							<Button onPress={()=> {
								lampInfo.setModeFill(selectColor)
								updateShowFillDialog(false)
							}}>Nastavit</Button>
						</Dialog.Actions>
					</Dialog>
				</Portal>
				<Text style={styles.deviceTitle}>{lampInfo.deviceName}</Text>
				<Button icon={"power"}
						mode={isLampActive ? "contained" : "contained-tonal"}
						onPress={() => lampInfo.toggle()}
				>{
					isLampActive ? "Vypnout" : "Zapnout"}
				</Button>
				<View style={styles.actionsDisplay}>
					<Button style={styles.buttonStyle} mode={"contained"} icon={"looks"} onPress={()=>lampInfo.setModeRainbow()}>Duha</Button>
					<Button style={styles.buttonStyle} mode={"contained"} icon={"palette"} onPress={()=>updateShowFillDialog(true)}>Vyplnit</Button>
					<Button style={styles.buttonStyle} mode={"contained"} icon={"thermometer"} onPress={()=>lampInfo.setModeWeather()}>Teplota</Button>
					<Button style={styles.buttonStyle} mode={"contained"} icon={"lightbulb"} onPress={()=>lampInfo.setModeFill("#FFFFFF")}>Lampička</Button>
					<Button style={styles.buttonStyle} mode={"contained"}>XD</Button>
				</View>
				<Slider minimumValue={0} maximumValue={100} value={lampInfo.brightness} onValueChange={lampInfo.updateBrightness} style={{width:"60%"}}/>
				<View style={styles.itemsInRow}>
					<Surface elevation={2} style={styles.surface}>
						{lampInfo.sensorInfo == null ?
							<ActivityIndicator animating/> :
							<View style={styles.itemsInRow}>
								<IconButton icon={"thermometer"} size={40}/>
								<View>
									<Text variant={"labelLarge"}>Teplota</Text>
									<Text>{lampInfo.sensorInfo?.temeprature}°C</Text>
								</View>
							</View>}
					</Surface>
					<Surface elevation={2} style={styles.surface}>
						{lampInfo.sensorInfo == null ?
							<ActivityIndicator animating/> :
							<View style={styles.itemsInRow}>
								<IconButton icon={"water-percent"} size={40}/>
								<View>
									<Text variant={"labelLarge"}>Vlhkost:</Text>
									<Text>{lampInfo.sensorInfo?.humidity}%</Text>
								</View>
							</View>}
					</Surface>
					<Surface elevation={2} style={styles.surface}>
						{lampInfo.sensorInfo == null ?
							<ActivityIndicator animating/> :
							<View style={styles.itemsInRow}>
								<IconButton icon={"white-balance-sunny"} size={40}/>
								<View>
									<Text variant={"labelLarge"}>Světlo:</Text>
									<Text>{lampInfo.sensorInfo?.bright}%</Text>
								</View>
							</View>}
					</Surface>
					<Surface elevation={2} style={styles.surface}>
						{lampInfo.sensorInfo == null ?
							<ActivityIndicator animating/> :
							<View style={styles.itemsInRow}>
								<IconButton icon={"information"} size={40}/>
								<View>
									<Text variant={"labelLarge"}>Režim:</Text>
									<Text>{lampInfo.sensorInfo?.currentMode}</Text>
									<Text variant={"labelLarge"}>Info:</Text>
									<Text>{(()=>{
										switch (lampInfo.sensorInfo.currentMode){
											case "weather":
												return lampInfo.sensorInfo.temeprature+"°C"
											case "fill":
												return <Text style={{color:selectColor}}>{selectColor}</Text>
											default: return "";
										}
									})()}</Text>
								</View>
							</View>}
					</Surface>
				</View>
				<StatusBar style="auto"/>
			</View>
		</PaperProvider>
	);
}


const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	surface: {
		padding: 8,
		width: "40%",
		aspectRatio: 1,
		alignItems: "center",
		justifyContent: "center",
		margin: 10,
		fontSize: 25
	},
	itemsInRow: {
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		flexWrap: "wrap"
	},
	deviceTitle: {
		fontSize: 20,
		padding: 15,
	},
	actionsDisplay: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
	},
	buttonStyle: {
		margin: 5,
		flexBasis: "30%"
	}
});
